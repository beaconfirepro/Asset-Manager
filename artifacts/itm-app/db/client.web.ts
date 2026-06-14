type AnyDb = {
  select: (...args: never[]) => never;
  insert: (...args: never[]) => never;
  update: (...args: never[]) => never;
  delete: (...args: never[]) => never;
};

export async function getDb(): Promise<AnyDb> {
  throw new Error(
    "SQLite is not available on web. Open the app in Expo Go on your iPad for full functionality.",
  );
}
