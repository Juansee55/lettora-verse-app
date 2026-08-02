import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useOnboarding, SURVEY_DELAY_MS } from "@/hooks/useOnboarding";
import TutorialOverlay from "./TutorialOverlay";
import ExperienceSurvey from "./ExperienceSurvey";

const HIDDEN_PREFIXES = ["/auth", "/tv", "/onboarding"];

const OnboardingManager = ({ userId }: { userId: string | null }) => {
  const location = useLocation();
  const { loading, tutorialCompleted, surveyCompleted, firstSeenAt, completeTutorial, completeSurvey } =
    useOnboarding(userId);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyDismissed, setSurveyDismissed] = useState(false);

  const blocked = HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (!userId || loading || surveyCompleted || surveyDismissed || !tutorialCompleted || !firstSeenAt) return;
    const remaining = firstSeenAt + SURVEY_DELAY_MS - Date.now();
    if (remaining <= 0) {
      setShowSurvey(true);
      return;
    }
    const t = setTimeout(() => setShowSurvey(true), remaining);
    return () => clearTimeout(t);
  }, [userId, loading, surveyCompleted, surveyDismissed, tutorialCompleted, firstSeenAt]);

  if (!userId || loading || blocked) return null;

  if (!tutorialCompleted) {
    return <TutorialOverlay onFinish={completeTutorial} />;
  }

  if (showSurvey) {
    return (
      <ExperienceSurvey
        userId={userId}
        onClose={() => {
          setShowSurvey(false);
          setSurveyDismissed(true);
        }}
        onCompleted={() => {
          setShowSurvey(false);
          completeSurvey();
        }}
      />
    );
  }

  return null;
};

export default OnboardingManager;