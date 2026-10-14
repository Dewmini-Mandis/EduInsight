import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Award, History, Target, AlertCircle } from "lucide-react";
import ProgressHeader from "../../components/student/progress/ProgressHeader";
import ProgressSummaryCard from "../../components/student/progress/ProgressSummaryCard";
import ScoreProgressChart from "../../components/student/progress/ScoreProgressChart";
import RecentActivity, { ActivityItem } from "../../components/student/progress/RecentActivity";
import { getToken } from "../../auth/authUtils";
import "../../styles/student.css";

interface QuizAttemptRaw {
  id: number;
  quiz: number;
  quiz_title?: string;
  lesson_title?: string;
  attempt_type?: "ORDINARY" | "REASSESSMENT";
  attempt_number: number;
  status: string;
  score: number | null;
  start_time: string;
  end_time?: string;
}

interface QuizRaw {
  id: number;
  title: string;
  pass_mark: number;
  lesson_title?: string;
}

const MyProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [quizzesPassed, setQuizzesPassed] = useState<number>(0);
  const [avgScore, setAvgScore] = useState<number | string>(0);
  const [totalFinalizedAttempts, setTotalFinalizedAttempts] = useState<number>(0);
  const [skillsMasteredCount, setSkillsMasteredCount] = useState<number | string>(0);

  const [chartAttempts, setChartAttempts] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const headers = { Authorization: `Token ${token}` };

      // Fetch attempts and quizzes in parallel
      const [attemptsRes, quizzesRes] = await Promise.all([
        fetch("/api/attempts/attempts/", { headers }),
        fetch("/api/quizzes/", { headers }),
      ]);

      if (!attemptsRes.ok) {
        throw new Error("Failed to load attempt history.");
      }

      const rawAttemptsData = await attemptsRes.json();
      const attemptsData: QuizAttemptRaw[] = Array.isArray(rawAttemptsData)
        ? rawAttemptsData
        : rawAttemptsData?.results || [];

      const rawQuizzesData = quizzesRes.ok ? await quizzesRes.json() : [];
      const quizzesData: QuizRaw[] = Array.isArray(rawQuizzesData)
        ? rawQuizzesData
        : rawQuizzesData?.results || [];

      const quizMap = new Map<number, QuizRaw>();
      quizzesData.forEach((q) => quizMap.set(q.id, q));

      // Filter finalized attempts (submitted or expired)
      const finalized = attemptsData.filter(
        (a) => a.status === "SUBMITTED" || a.status === "EXPIRED"
      );

      // Only ordinary finalized attempts for primary metrics
      const ordinaryFinalized = finalized.filter(
        (a) => !a.attempt_type || a.attempt_type === "ORDINARY"
      );

      // Total finalized ordinary attempts count
      setTotalFinalizedAttempts(ordinaryFinalized.length);

      // Group ordinary attempts by quiz ID to get latest per quiz
      const attemptsByQuiz = new Map<number, QuizAttemptRaw[]>();
      ordinaryFinalized.forEach((att) => {
        const list = attemptsByQuiz.get(att.quiz) || [];
        list.push(att);
        attemptsByQuiz.set(att.quiz, list);
      });

      let passedCount = 0;
      let latestScoresSum = 0;
      let attemptedQuizzesCount = 0;

      attemptsByQuiz.forEach((quizAttempts, quizId) => {
        // Sort by attempt_number descending to find the latest completed attempt
        quizAttempts.sort((a, b) => b.attempt_number - a.attempt_number);
        const latestAtt = quizAttempts[0];

        const quizObj = quizMap.get(quizId);
        const passMark = quizObj?.pass_mark ?? 60;
        const score = latestAtt.score ?? 0;

        if (score >= passMark) {
          passedCount++;
        }

        latestScoresSum += score;
        attemptedQuizzesCount++;
      });

      setQuizzesPassed(passedCount);

      // Average score = mean of latest completed ordinary attempt for each attempted quiz
      if (attemptedQuizzesCount > 0) {
        setAvgScore(Math.round((latestScoresSum / attemptedQuizzesCount) * 10) / 10);
      } else {
        setAvgScore("N/A");
      }

      // Skills mastered calculation: count quizzes with score >= 80% on latest attempt
      let mastered = 0;
      attemptsByQuiz.forEach((quizAttempts) => {
        quizAttempts.sort((a, b) => b.attempt_number - a.attempt_number);
        if ((quizAttempts[0].score ?? 0) >= 80) {
          mastered++;
        }
      });
      setSkillsMasteredCount(attemptedQuizzesCount > 0 ? mastered : 0);

      // Format Chart Data (chronological order of ordinary finalized attempts)
      const sortedChronological = [...ordinaryFinalized].sort((a, b) => {
        const dateA = new Date(a.end_time || a.start_time).getTime();
        const dateB = new Date(b.end_time || b.start_time).getTime();
        return dateA - dateB;
      });

      const chartDataPoints = sortedChronological.map((att) => {
        const quizObj = quizMap.get(att.quiz);
        const title = att.quiz_title || quizObj?.title || `Quiz #${att.quiz}`;
        const dateObj = new Date(att.end_time || att.start_time);
        const dateStr = dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        return {
          id: att.id,
          quizTitle: title,
          attemptNumber: att.attempt_number,
          attemptType: att.attempt_type || "ORDINARY",
          score: att.score ?? 0,
          dateStr,
        };
      });

      setChartAttempts(chartDataPoints);

      // Recent activity items (latest 5 finalized attempts regardless of ordinary/reassessment)
      const sortedRecent = [...finalized].sort((a, b) => {
        const dateA = new Date(a.end_time || a.start_time).getTime();
        const dateB = new Date(b.end_time || b.start_time).getTime();
        return dateB - dateA;
      });

      const activityItems: ActivityItem[] = sortedRecent.map((att) => {
        const quizObj = quizMap.get(att.quiz);
        const title = att.quiz_title || quizObj?.title || `Quiz #${att.quiz}`;
        const passMark = quizObj?.pass_mark ?? 60;
        const score = att.score ?? 0;
        const dateObj = new Date(att.end_time || att.start_time);
        const completionDate = dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        return {
          id: att.id,
          quizId: att.quiz,
          title,
          lessonName: att.lesson_title || quizObj?.lesson_title || "General Lesson",
          completionDate,
          score,
          isPassed: score >= passMark,
          attemptNumber: att.attempt_number,
          attemptType: att.attempt_type,
        };
      });

      setRecentActivities(activityItems);
    } catch (err: any) {
      console.error("Error loading progress dashboard:", err);
      setError(err.message || "Failed to load progress details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", paddingBottom: "40px" }}>
      <ProgressHeader
        title="My Progress"
        subtitle="Track your quizzes and learning journey."
      />

      {loading ? (
        <div className="student-card" style={{ padding: "48px", textAlign: "center", marginTop: "24px", width: "100%", boxSizing: "border-box" }}>
          <div className="student-loading-spinner" style={{ margin: "0 auto 16px auto" }} />
          <p style={{ color: "#5D78A3", fontSize: "14px", margin: 0 }}>Loading your learning analytics...</p>
        </div>
      ) : error ? (
        <div className="student-card" style={{ padding: "32px", marginTop: "24px", borderColor: "#FF4054", width: "100%", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#FF4054" }}>
            <AlertCircle size={24} />
            <span style={{ fontWeight: 600 }}>{error}</span>
          </div>
          <button
            type="button"
            className="student-btn-primary"
            style={{ marginTop: "16px", padding: "8px 16px" }}
            onClick={fetchProgressData}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "24px",
              marginTop: "24px",
              marginBottom: "24px",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <ProgressSummaryCard
              label="Quizzes Passed"
              value={quizzesPassed}
              icon={<CheckCircle2 size={22} color="#16B978" />}
              iconBg="#E9FBF4"
            />

            <ProgressSummaryCard
              label="Average Score"
              value={typeof avgScore === "number" ? `${avgScore}%` : avgScore}
              icon={<Award size={22} color="#126BFF" />}
              iconBg="#EAF3FF"
              tooltipText="Mean score of your most recent completed attempt for each attempted quiz."
            />

            <ProgressSummaryCard
              label="Quiz Attempts"
              value={totalFinalizedAttempts}
              icon={<History size={22} color="#6C4BFF" />}
              iconBg="#F1EDFF"
              tooltipText="Total count of finalized ordinary quiz attempts."
            />

            <ProgressSummaryCard
              label="Skills Mastered"
              value={skillsMasteredCount}
              icon={<Target size={22} color="#169BFF" />}
              iconBg="#EAF3FF"
              tooltipText="Count of skills where latest quiz performance is 80% or higher."
            />
          </div>

          {/* Line Chart */}
          <div style={{ marginTop: "24px", width: "100%" }}>
            <ScoreProgressChart attempts={chartAttempts} />
          </div>

          {/* Recent Activity */}
          <div style={{ marginTop: "24px", width: "100%" }}>
            <RecentActivity activities={recentActivities} />
          </div>
        </>
      )}
    </div>
  );
};

export default MyProgressPage;
