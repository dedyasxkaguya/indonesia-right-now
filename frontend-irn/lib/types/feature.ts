export type FeatureStatus = 'available' | 'insufficient' | 'unavailable';

export type DerivedResult<T> = {
  value: T;
  insufficient: boolean;
};
