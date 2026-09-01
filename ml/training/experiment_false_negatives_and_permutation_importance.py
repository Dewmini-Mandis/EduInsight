import os, warnings
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import average_precision_score, roc_auc_score, recall_score, f1_score, confusion_matrix
from sklearn.utils.class_weight import compute_sample_weight
from sklearn.model_selection import GroupShuffleSplit
warnings.filterwarnings("ignore")
SEED=42
A=["past_accuracy","early_accuracy","recent_accuracy","recent3_accuracy","improvement_rate","accuracy_trend","correct_streak","wrong_streak"]
E=["past_avg_time","past_median_time","recent_avg_time","response_time_trend","past_avg_attempts","recent_avg_attempts","attempt_trend"]
F=A+E
CFG={
"assistments":(["ml/data_pipeline/assistments_risk_training_v3.csv","ml/data_pipeline/assistments_risk_training_v4.csv"],0.60,dict(learning_rate=.03,max_depth=4,min_samples_leaf=5,min_samples_split=5,n_estimators=350,subsample=1.0)),
"junyi":(["ml/data_pipeline/junyi_risk_training_binary.csv"],0.50,dict(learning_rate=.03,max_depth=4,min_samples_leaf=2,min_samples_split=5,n_estimators=350,subsample=.8))}
def path(xs):
    for x in xs:
        if os.path.exists(x): return x
    raise FileNotFoundError(str(xs))
def y(d):
    if "binary_risk" in d:
        s=d["binary_risk"]
        if not pd.api.types.is_numeric_dtype(s): return s.astype(str).str.lower().eq("high risk").astype(int).values
        return s.astype(int).values
    return (d.future_accuracy<.5).astype(int).values
def split(d):
    g=d.user_id.astype(str)
    a,b=next(GroupShuffleSplit(n_splits=1,test_size=.2,random_state=42).split(d,groups=g))
    tv,t=d.iloc[a].copy(),d.iloc[b].copy()
    a,b=next(GroupShuffleSplit(n_splits=1,test_size=.2,random_state=42).split(tv,groups=tv.user_id.astype(str)))
    return tv.iloc[a].copy(),tv.iloc[b].copy(),t
for name,(paths,thr,params) in CFG.items():
    print("\n"+"="*60+"\n"+name.upper()+"\n"+"="*60)
    d=pd.read_csv(path(paths),low_memory=False); d.user_id=d.user_id.astype(str)
    tr,va,te=split(d); fit=pd.concat([tr,va])
    print("Students train/val/test:",tr.user_id.nunique(),va.user_id.nunique(),te.user_id.nunique())
    yfit=y(fit); sw=compute_sample_weight(class_weight="balanced", y=yfit); m=GradientBoostingClassifier(random_state=42,**params).fit(fit[F].astype(float),yfit,sample_weight=sw)
    p=m.predict_proba(te[F].astype(float))[:,1]; yt=y(te); yp=(p>=thr).astype(int)
    tn,fp,fn,tp=confusion_matrix(yt,yp,labels=[0,1]).ravel()
    print("AUC %.2f | PR-AUC %.2f | Recall %.2f | F1 %.2f | FN %d | TP %d"%(100*roc_auc_score(yt,p),100*average_precision_score(yt,p),100*recall_score(yt,yp),100*f1_score(yt,yp),fn,tp))
    z=te.copy(); z["y_true"]=yt; z["y_pred"]=yp; z["prob_high_risk"]=p
    z["error_group"]=np.select([(yt==1)&(yp==0),(yt==1)&(yp==1),(yt==0)&(yp==1),(yt==0)&(yp==0)],["False Negative","True Positive","False Positive","True Negative"],default="Unknown")
    hi=z[z.y_true==1]; fnz=hi[hi.error_group=="False Negative"]; tpz=hi[hi.error_group=="True Positive"]
    rows=[]
    for f in F:
        sd=hi[f].std()
        rows.append([f,fnz[f].mean(),tpz[f].mean(),(fnz[f].mean()-tpz[f].mean())/sd if sd else np.nan])
    comp=pd.DataFrame(rows,columns=["feature","false_negative_mean","true_positive_mean","standardized_difference"])
    comp["abs_standardized_difference"]=comp.standardized_difference.abs(); comp=comp.sort_values("abs_standardized_difference",ascending=False)
    print("\nLargest FN vs TP differences:\n",comp.head(10).to_string(index=False))
    print("\nPermutation importance (held-out PR-AUC)...")
    # Memory-safe permutation importance: fixed held-out subsample, float32, single process.
    rng=np.random.RandomState(42)
    max_pi_rows=25000
    if len(te)>max_pi_rows:
        pos=np.where(yt==1)[0]; neg=np.where(yt==0)[0]
        pos_n=max(1, round(max_pi_rows*len(pos)/len(yt)))
        neg_n=max_pi_rows-pos_n
        pos_sel=rng.choice(pos,size=min(pos_n,len(pos)),replace=False)
        neg_sel=rng.choice(neg,size=min(neg_n,len(neg)),replace=False)
        pi_idx=np.concatenate([pos_sel,neg_sel])
        rng.shuffle(pi_idx)
    else:
        pi_idx=np.arange(len(te))
    X_pi=te.iloc[pi_idx][F].to_numpy(dtype=np.float32,copy=True)
    y_pi=yt[pi_idx]
    print("Permutation-importance rows:",len(pi_idx))
    pi=permutation_importance(m,X_pi,y_pi,scoring="average_precision",n_repeats=5,random_state=42,n_jobs=1)
    imp=pd.DataFrame({"feature":F,"importance_mean_PR_AUC":pi.importances_mean,"importance_std_PR_AUC":pi.importances_std}).sort_values("importance_mean_PR_AUC",ascending=False)
    print(imp.to_string(index=False))
    out=f"ml/reports/{name}_false_negative_feature_importance"; os.makedirs(out,exist_ok=True)
    comp.to_csv(out+"/false_negative_vs_true_positive.csv",index=False)
    imp.to_csv(out+"/permutation_importance_pr_auc.csv",index=False)
    z.to_csv(out+"/test_predictions_error_groups.csv",index=False)
    pd.DataFrame([{"dataset":name,"threshold":thr,"roc_auc":roc_auc_score(yt,p),"pr_auc":average_precision_score(yt,p),"recall":recall_score(yt,yp),"f1":f1_score(yt,yp),"FN":fn,"TP":tp}]).to_csv(out+"/heldout_metrics.csv",index=False)
    print("Reports:",out)
print("\nDONE")
