import os
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import (
    GroupShuffleSplit,
    ParameterGrid
)

from sklearn.ensemble import (
    GradientBoostingClassifier
)

from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix
)

from sklearn.utils.class_weight import (
    compute_class_weight
)


# ============================================================
# CONFIGURATION
# ============================================================

DATA_PATH = (
    "ml/data_pipeline/junyi_risk_training_binary.csv"
)

REPORT_DIR = (
    "ml/reports/junyi_academic_vs_engagement"
)

MODEL_DIR = (
    "ml/models"
)

os.makedirs(
    REPORT_DIR,
    exist_ok=True
)

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

RANDOM_STATE = 42


# ============================================================
# FEATURE SET 1 - ACADEMIC ONLY
# ============================================================

ACADEMIC_FEATURES = [

    "past_accuracy",
    "early_accuracy",
    "recent_accuracy",
    "recent3_accuracy",
    "improvement_rate",
    "accuracy_trend",

    "correct_streak",
    "wrong_streak",
]


# ============================================================
# FEATURE SET 2 - ACADEMIC + ENGAGEMENT
# ============================================================

ACADEMIC_ENGAGEMENT_FEATURES = [

    # Academic
    "past_accuracy",
    "early_accuracy",
    "recent_accuracy",
    "recent3_accuracy",
    "improvement_rate",
    "accuracy_trend",

    "correct_streak",
    "wrong_streak",

    # Engagement - response time
    "past_avg_time",
    "past_median_time",
    "recent_avg_time",
    "response_time_trend",

    # Engagement - attempts
    "past_avg_attempts",
    "recent_avg_attempts",
    "attempt_trend",
]


FEATURE_SETS = {

    "Academic Only":
        ACADEMIC_FEATURES,

    "Academic + Engagement":
        ACADEMIC_ENGAGEMENT_FEATURES,
}


# ============================================================
# HYPERPARAMETER GRID
# ============================================================

PARAM_GRID = {

    "n_estimators": [
        250,
        350
    ],

    "learning_rate": [
        0.03,
        0.05
    ],

    "max_depth": [
        3,
        4
    ],

    "min_samples_leaf": [
        2,
        5
    ],

    "min_samples_split": [
        5
    ],

    "subsample": [
        0.8,
        1.0
    ],
}


# ============================================================
# THRESHOLD SEARCH
# ============================================================

THRESHOLDS = np.arange(
    0.40,
    0.71,
    0.02
)


# ============================================================
# METRIC FUNCTION
# ============================================================

def calculate_metrics(
    y_true,
    probabilities,
    threshold
):

    predictions = (
        probabilities
        >= threshold
    ).astype(int)


    accuracy = accuracy_score(
        y_true,
        predictions
    )


    balanced_accuracy = (
        balanced_accuracy_score(
            y_true,
            predictions
        )
    )


    high_risk_precision = precision_score(
        y_true,
        predictions,
        pos_label=1,
        zero_division=0
    )


    high_risk_recall = recall_score(
        y_true,
        predictions,
        pos_label=1,
        zero_division=0
    )


    high_risk_f1 = f1_score(
        y_true,
        predictions,
        pos_label=1,
        zero_division=0
    )


    macro_f1 = f1_score(
        y_true,
        predictions,
        average="macro",
        zero_division=0
    )


    weighted_f1 = f1_score(
        y_true,
        predictions,
        average="weighted",
        zero_division=0
    )


    roc_auc = roc_auc_score(
        y_true,
        probabilities
    )


    pr_auc = average_precision_score(
        y_true,
        probabilities
    )


    matrix = confusion_matrix(
        y_true,
        predictions,
        labels=[
            0,
            1
        ]
    )


    tn, fp, fn, tp = (
        matrix.ravel()
    )


    specificity = (
        tn / (tn + fp)
        if (tn + fp) > 0
        else 0
    )


    false_negative_rate = (
        fn / (fn + tp)
        if (fn + tp) > 0
        else 0
    )


    return {

        "Accuracy":
            accuracy,

        "Balanced Accuracy":
            balanced_accuracy,

        "High Risk Precision":
            high_risk_precision,

        "High Risk Recall":
            high_risk_recall,

        "High Risk F1":
            high_risk_f1,

        "Macro F1":
            macro_f1,

        "Weighted F1":
            weighted_f1,

        "Specificity":
            specificity,

        "False Negative Rate":
            false_negative_rate,

        "ROC-AUC":
            roc_auc,

        "PR-AUC":
            pr_auc,

        "TN":
            int(tn),

        "FP":
            int(fp),

        "FN":
            int(fn),

        "TP":
            int(tp),
    }



# ============================================================
# RISK-DEFINITION SENSITIVITY: 0.40 / 0.50 / 0.60
# ============================================================
RISK_CUTOFFS = [0.40, 0.50, 0.60]
SENSITIVITY_REPORT_DIR = "ml/reports/junyi_risk_threshold_sensitivity"
os.makedirs(SENSITIVITY_REPORT_DIR, exist_ok=True)

print("=" * 60)
print("JUNYI RISK-DEFINITION SENSITIVITY ANALYSIS")
print("=" * 60)

df = pd.read_csv(DATA_PATH)
required_columns = list(set(ACADEMIC_ENGAGEMENT_FEATURES)) + ["user_id", "future_accuracy"]
missing = [c for c in required_columns if c not in df.columns]
if missing:
    raise ValueError("Missing required columns: " + str(missing))

df = df.replace([np.inf, -np.inf], np.nan).dropna(subset=required_columns).copy()

# Create ONE fixed student split, independent of the risk label.
groups = df["user_id"]
outer = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=RANDOM_STATE)
dev_idx, test_idx = next(outer.split(df, groups=groups))
dev = df.iloc[dev_idx].copy()
test_base = df.iloc[test_idx].copy()

inner = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=RANDOM_STATE)
train_idx, val_idx = next(inner.split(dev, groups=dev["user_id"]))
train_base = dev.iloc[train_idx].copy()
val_base = dev.iloc[val_idx].copy()

train_students=set(train_base["user_id"].unique())
val_students=set(val_base["user_id"].unique())
test_students=set(test_base["user_id"].unique())
assert not train_students & val_students
assert not train_students & test_students
assert not val_students & test_students

print("Fixed students:", len(train_students), len(val_students), len(test_students))

all_results=[]
all_hyper=[]
all_thresholds=[]
all_prevalence=[]

for risk_cutoff in RISK_CUTOFFS:
    print("\n" + "="*60)
    print(f"HIGH RISK = future_accuracy < {risk_cutoff:.2f}")
    print("="*60)

    train_df=train_base.copy()
    validation_df=val_base.copy()
    test_df=test_base.copy()

    for split_name, part in [("Train",train_df),("Validation",validation_df),("Test",test_df)]:
        part["binary_target"]=(part["future_accuracy"].astype(float)<risk_cutoff).astype(int)
        all_prevalence.append({
            "Risk Cutoff":risk_cutoff,"Split":split_name,"Rows":len(part),
            "Students":part["user_id"].nunique(),
            "High Risk Count":int(part["binary_target"].sum()),
            "High Risk Prevalence":part["binary_target"].mean()
        })
        print(split_name, "High-Risk prevalence:", round(part["binary_target"].mean()*100,2), "%")

    y_train_common=train_df["binary_target"].to_numpy()
    classes=np.unique(y_train_common)
    if len(classes)<2:
        raise ValueError(f"Only one training class at cutoff {risk_cutoff}")
    weights=compute_class_weight(class_weight="balanced",classes=classes,y=y_train_common)
    wd=dict(zip(classes,weights))
    sample_weights=np.array([wd[v] for v in y_train_common])

    for experiment_name,features in FEATURE_SETS.items():
        print(f"\n{risk_cutoff:.2f} | {experiment_name}")
        X_train=train_df[features]; X_val=validation_df[features]; X_test=test_df[features]
        y_train=train_df["binary_target"].to_numpy()
        y_val=validation_df["binary_target"].to_numpy()
        y_test=test_df["binary_target"].to_numpy()

        best_params=None; best_auc=-1; best_f1=-1
        plist=list(ParameterGrid(PARAM_GRID))
        for i,params in enumerate(plist,1):
            model=GradientBoostingClassifier(random_state=RANDOM_STATE,**params)
            model.fit(X_train,y_train,sample_weight=sample_weights)
            pv=model.predict_proba(X_val)[:,1]
            m=calculate_metrics(y_val,pv,0.50)
            all_hyper.append({"Risk Cutoff":risk_cutoff,"Experiment":experiment_name,**params,**m})
            if m["ROC-AUC"]>best_auc or (np.isclose(m["ROC-AUC"],best_auc) and m["High Risk F1"]>best_f1):
                best_auc=m["ROC-AUC"]; best_f1=m["High Risk F1"]; best_params=params.copy()
            print(f"{i}/{len(plist)} | AUC {m['ROC-AUC']:.4f}",end="\r")
        print()

        vm=GradientBoostingClassifier(random_state=RANDOM_STATE,**best_params)
        vm.fit(X_train,y_train,sample_weight=sample_weights)
        pv=vm.predict_proba(X_val)[:,1]

        best_threshold=None; best_tf1=-1; best_bal=-1
        for threshold in THRESHOLDS:
            m=calculate_metrics(y_val,pv,threshold)
            all_thresholds.append({"Risk Cutoff":risk_cutoff,"Experiment":experiment_name,"Model Probability Threshold":float(threshold),**m})
            if m["High Risk F1"]>best_tf1 or (np.isclose(m["High Risk F1"],best_tf1) and m["Balanced Accuracy"]>best_bal):
                best_tf1=m["High Risk F1"]; best_bal=m["Balanced Accuracy"]; best_threshold=float(threshold)

        final_train=pd.concat([train_df,validation_df],ignore_index=True)
        yf=final_train["binary_target"].to_numpy()
        fc=np.unique(yf)
        fw=compute_class_weight(class_weight="balanced",classes=fc,y=yf)
        fwd=dict(zip(fc,fw))
        fsw=np.array([fwd[v] for v in yf])
        fm=GradientBoostingClassifier(random_state=RANDOM_STATE,**best_params)
        fm.fit(final_train[features],yf,sample_weight=fsw)
        pt=fm.predict_proba(X_test)[:,1]
        tm=calculate_metrics(y_test,pt,best_threshold)

        all_results.append({
            "Risk Cutoff":risk_cutoff,"Experiment":experiment_name,
            "Feature Count":len(features),"High Risk Test Prevalence":y_test.mean(),
            "Model Probability Threshold":best_threshold,**best_params,**tm
        })
        print("Best params:",best_params)
        print("Probability threshold:",round(best_threshold,2))
        print("TEST | AUC {:.2f}% | PR-AUC {:.2f}% | Recall {:.2f}% | F1 {:.2f}%".format(
            tm["ROC-AUC"]*100,tm["PR-AUC"]*100,tm["High Risk Recall"]*100,tm["High Risk F1"]*100))

results_df=pd.DataFrame(all_results)
prevalence_df=pd.DataFrame(all_prevalence)
hyper_df=pd.DataFrame(all_hyper)
threshold_df=pd.DataFrame(all_thresholds)

comparison=[]
for cutoff in RISK_CUTOFFS:
    sub=results_df[results_df["Risk Cutoff"]==cutoff]
    a=sub[sub["Experiment"]=="Academic Only"].iloc[0]
    e=sub[sub["Experiment"]=="Academic + Engagement"].iloc[0]
    for metric in ["Accuracy","Balanced Accuracy","High Risk Precision","High Risk Recall","High Risk F1","ROC-AUC","PR-AUC"]:
        comparison.append({"Risk Cutoff":cutoff,"Metric":metric,"Academic Only":a[metric],
                           "Academic + Engagement":e[metric],
                           "A+E - Academic (pp)":(e[metric]-a[metric])*100})
comparison_df=pd.DataFrame(comparison)

results_df.to_csv(os.path.join(SENSITIVITY_REPORT_DIR,"junyi_risk_cutoff_results.csv"),index=False)
comparison_df.to_csv(os.path.join(SENSITIVITY_REPORT_DIR,"junyi_risk_cutoff_comparison.csv"),index=False)
prevalence_df.to_csv(os.path.join(SENSITIVITY_REPORT_DIR,"junyi_risk_cutoff_prevalence.csv"),index=False)
hyper_df.to_csv(os.path.join(SENSITIVITY_REPORT_DIR,"junyi_risk_cutoff_hyperparameters.csv"),index=False)
threshold_df.to_csv(os.path.join(SENSITIVITY_REPORT_DIR,"junyi_risk_cutoff_probability_thresholds.csv"),index=False)

print("\n"+"="*60)
print("FINAL SENSITIVITY SUMMARY")
print("="*60)
summary=results_df[["Risk Cutoff","Experiment","High Risk Test Prevalence","Model Probability Threshold",
                    "Balanced Accuracy","High Risk Recall","High Risk F1","ROC-AUC","PR-AUC"]].copy()
for c in ["High Risk Test Prevalence","Balanced Accuracy","High Risk Recall","High Risk F1","ROC-AUC","PR-AUC"]:
    summary[c]=(summary[c]*100).round(2)
print(summary.to_string(index=False))

print("\nKEY A+E - ACADEMIC DIFFERENCES (percentage points)")
print(comparison_df[comparison_df["Metric"].isin(["ROC-AUC","PR-AUC","High Risk Recall","High Risk F1"])].to_string(index=False))
print("\nReports:",SENSITIVITY_REPORT_DIR)
print("DONE.")
