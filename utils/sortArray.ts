/**
 * Array Sorting Utility Functions
 *
 * This module provides utility functions for sorting arrays of objects
 * either by regular properties or by date properties.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Sorts an array of objects by a specified property
 *
 * @param {Array<any>} tab - The array to be sorted
 * @param {string} property - The object property to sort by
 * @param {boolean} direction - Sort direction: true for ascending (default), false for descending
 * @returns {Array<any>} A new sorted array (original array is not modified)
 *
 * @example
 * // Sort users by name in ascending order
 * const sortedUsers = sortArray(users, 'name', true);
 *
 * @example
 * // Sort products by price in descending order
 * const expensiveFirst = sortArray(products, 'price', false);
 */
export const sortArray = (
  tab: Array<any>,
  property: string,
  direction = true
) => {
  // Create a mutable copy of the array to avoid modifying the original
  const sortedArray = [...tab];

  if (direction) {
    // Ascending order sort (A to Z, 1 to 9)
    sortedArray.sort(function compare(a: any, b: any) {
      if (a[property] < b[property]) return -1;
      if (a[property] > b[property]) return 1;
      return 0; // Values are equal
    });
  } else {
    // Descending order sort (Z to A, 9 to 1)
    sortedArray.sort(function compare(a: any, b: any) {
      if (a[property] > b[property]) return -1;
      if (a[property] < b[property]) return 1;
      return 0; // Values are equal
    });
  }
  return sortedArray;
};

/**
 * Sorts an array of objects by a date property
 *
 * Converts string date properties to Date objects for proper chronological sorting
 *
 * @param {Array<any>} tab - The array to be sorted
 * @param {string} property - The object property containing date values
 * @param {boolean} direction - Sort direction: true for ascending (oldest first, default), false for descending (newest first)
 * @returns {Array<any>} A new sorted array (original array is not modified)
 *
 * @example
 * // Sort events by start date (oldest first)
 * const chronologicalEvents = sortArrayByDate(events, 'startDate', true);
 *
 * @example
 * // Sort posts by publication date (newest first)
 * const newestPosts = sortArrayByDate(posts, 'publishedAt', false);
 */
export const sortArrayByDate = (
  tab: Array<any>,
  property: string,
  direction = true
) => {
  // Create a mutable copy of the array to avoid modifying the original
  const sortedArray = [...tab];

  if (direction) {
    // Ascending date sort (oldest to newest)
    sortedArray.sort(function compare(a: any, b: any) {
      return new Date(a[property]).getTime() - new Date(b[property]).getTime();
    });
  } else {
    // Descending date sort (newest to oldest)
    sortedArray.sort(function compare(a: any, b: any) {
      return new Date(b[property]).getTime() - new Date(a[property]).getTime();
    });
  }
  return sortedArray;
};
