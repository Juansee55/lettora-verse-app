import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LS_TUTORIAL = "lettora_tutorial_completed";
const LS_SURVEY = "lettora_survey_completed";
const LS_FIRST_SEEN = "lettora_first_seen_at";

export const SURVEY_DELAY_MS = 8 * 60 * 1000;

export interface OnboardingState {
  loading: boolean;
  tutorialCompleted: boolean;
  surveyCompleted: boolean;
  firstSeenAt: number | null;
}

export function useOnboarding(userId: string | null) {
  const [state, setState] = useState<OnboardingState>({
    loading: true,
    tutorialCompleted: localStorage.getItem(LS_TUTORIAL) === "true",
    surveyCompleted: localStorage.getItem(LS_SURVEY) === "true",
    firstSeenAt: Number(localStorage.getItem(LS_FIRST_SEEN)) || null,
  });

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("user_onboarding")
        .select("tutorial_completed, survey_completed, first_seen_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }

      if (!data) {
        const nowIso = new Date().toISOString();
        await supabase.from("user_onboarding").insert({ user_id: userId, first_seen_at: nowIso });
        localStorage.setItem(LS_FIRST_SEEN, String(Date.parse(nowIso)));
        if (cancelled) return;
        setState({ loading: false, tutorialCompleted: false, surveyCompleted: false, firstSeenAt: Date.parse(nowIso) });
        return;
      }

      const firstSeen = data.first_seen_at ? Date.parse(data.first_seen_at) : Date.now();
      localStorage.setItem(LS_FIRST_SEEN, String(firstSeen));
      if (data.tutorial_completed) localStorage.setItem(LS_TUTORIAL, "true");
      if (data.survey_completed) localStorage.setItem(LS_SURVEY, "true");

      setState({
        loading: false,
        tutorialCompleted: !!data.tutorial_completed,
        surveyCompleted: !!data.survey_completed,
        firstSeenAt: firstSeen,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const completeTutorial = useCallback(async () => {
    localStorage.setItem(LS_TUTORIAL, "true");
    setState((s) => ({ ...s, tutorialCompleted: true }));
    if (!userId) return;
    await supabase
      .from("user_onboarding")
      .upsert(
        { user_id: userId, tutorial_completed: true, tutorial_completed_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
  }, [userId]);

  const completeSurvey = useCallback(async () => {
    localStorage.setItem(LS_SURVEY, "true");
    setState((s) => ({ ...s, surveyCompleted: true }));
    if (!userId) return;
    await supabase
      .from("user_onboarding")
      .upsert(
        { user_id: userId, survey_completed: true, survey_completed_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
  }, [userId]);

  return { ...state, completeTutorial, completeSurvey };
}