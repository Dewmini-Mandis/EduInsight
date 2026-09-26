export interface FeedbackItem {
  id: string;
  type: "positive" | "suggestion";
  text: string;
}

export const mockFeedbackData: FeedbackItem[] = [
  {
    id: "f1",
    type: "positive",
    text: "You did well on perimeter and area questions.",
  },
  {
    id: "f2",
    type: "suggestion",
    text: "Review square properties for even better results.",
  },
];
