export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Home: undefined;
  MainTabs: { screen?: keyof MainTabParamList } | undefined;
  Battle: undefined;
  Rules: undefined;
  PackReveal: undefined;
  CardDetail: { cardId: string };
  Story: undefined;
};
export type MainTabParamList = {
  HomeTab: undefined;
  Collection: undefined;
  Deck: undefined;
  Shop: undefined;
  Profile: undefined;
};
