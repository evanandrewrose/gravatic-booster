export const sizeOfStringifiableObject = (obj: object): number =>
  JSON.stringify(obj).length;
