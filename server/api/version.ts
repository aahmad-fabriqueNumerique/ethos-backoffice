/**
 * Server event handler that retrieves the application version.
 *
 * This asynchronous function accesses the "assets:server" storage to read the contents
 * of the "app-version.txt" file. If the file is found, its content is converted to a
 * string and returned; otherwise, an empty string is returned.
 *
 * @async
 * @function
 * @returns {Promise<string|undefined>} A promise that resolves to the app version string,
 * or an empty string if the version file is not present.
 */
export default defineEventHandler(async (): Promise<string | undefined> => {
  const assetStorage = useStorage("assets:server");
  const appVersion =
    (await assetStorage.getItem("app-version.txt"))?.toString() || "";

  return appVersion;
});
