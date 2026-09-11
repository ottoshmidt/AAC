// @ts-check
/**
 * Splitting the picture pool into pages of `perPage` pictures.
 */

/**
 * @param {number} total    number of pictures
 * @param {number} perPage
 */
export function pageCount(total, perPage) {
  return Math.max(1, Math.ceil(total / perPage));
}

/**
 * Indices of the pictures on `page` (0-based). The last page may be shorter.
 * @param {number} total
 * @param {number} perPage
 * @param {number} page
 * @returns {number[]}
 */
export function pageIndices(total, perPage, page) {
  const start = page * perPage;
  return Array.from({ length: Math.max(0, Math.min(perPage, total - start)) }, (_, i) => start + i);
}

/**
 * Wrap a page number into 0..count-1, so paging past the end goes to the
 * start and vice versa.
 * @param {number} page
 * @param {number} count
 */
export function wrapPage(page, count) {
  return ((page % count) + count) % count;
}

/**
 * Which page is showing and which of its pictures have been chosen.
 *
 * Positions ("slots") are 0-based places on the current page. Chosen slots
 * stay on screen but are left out of scanning; once every slot has been
 * chosen, the next round moves on to the next page, and after the last page
 * it starts over at the first.
 */
export class PageProgress {
  /**
   * @param {number} total    number of pictures
   * @param {number} perPage
   */
  constructor(total, perPage) {
    this.total = total;
    this.perPage = perPage;
    this.page = 0;
    /** @type {Set<number>} chosen slots on the current page */
    this.chosen = new Set();
  }

  get pageCount() {
    return pageCount(this.total, this.perPage);
  }

  /** Picture indices shown on the current page, by slot. */
  get pictures() {
    return pageIndices(this.total, this.perPage, this.page);
  }

  /** Slots still to be chosen, in scanning order. */
  get remaining() {
    return this.pictures.map((_, slot) => slot).filter((slot) => !this.chosen.has(slot));
  }

  /** @param {number} slot */
  choose(slot) {
    this.chosen.add(slot);
  }

  /**
   * Call at the start of every round. Moves to the next page (wrapping to the
   * first) once all pictures on this one have been chosen.
   * @returns {boolean} whether the page changed
   */
  startRound() {
    if (this.pictures.length > 0 && this.remaining.length === 0) {
      this.turn(+1);
      return true;
    }
    return false;
  }

  /**
   * Go to another page (e.g. the caregiver's arrow keys). It starts fresh.
   * @param {number} delta
   */
  turn(delta) {
    this.page = wrapPage(this.page + delta, this.pageCount);
    this.chosen.clear();
  }

  /**
   * Change the page size, keeping the first picture in view. Starts fresh.
   * @param {number} perPage
   */
  setPerPage(perPage) {
    if (perPage === this.perPage) return;
    const firstShown = this.page * this.perPage;
    this.perPage = perPage;
    this.page = Math.floor(firstShown / perPage);
    this.chosen.clear();
  }
}
