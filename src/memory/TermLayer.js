import { Layer } from './Layer.js';
import { Bag } from './Bag.js';

/**
 * TermLayer - A concrete Layer implementation that stores associative links between terms.
 * Uses a capacity-limited Bag of prioritized references for AIKR compliance.
 */
export class TermLayer extends Layer {
  /**
   * Constructor for TermLayer
   * @param {Object} config - Configuration options
   * @param {number} config.capacity - Maximum number of links to store
   */
  constructor(config = {}) {
    super(config);
    
    // Use a capacity-limited bag for storing associative links
    this.linkBag = new Bag(this.capacity);
    this.linkMap = new Map(); // Store link data: source -> Map of {target -> linkData}
    this.count = 0; // Track the total number of links
  }

  /**
   * Add an associative link between two terms
   * @param {Term} source - Source term
   * @param {Term} target - Target term
   * @param {Object} data - Additional link data (priority, confidence, etc.)
   * @returns {boolean} - True if link was added successfully
   */
  add(source, target, data = {}) {
    this._ensureCapacity();
    
    // Initialize source map if it doesn't exist
    const sourceLinks = this._getOrCreateSourceMap(source.name);
    const priority = data.priority || 1; // Default priority
    
    // Add to the bag with its priority
    const linkEntry = this._createLinkEntry(source, target, { ...data, priority });
    
    // Add to bag - if bag is at capacity, it'll auto-evict lowest priority
    const added = this.linkBag.add(linkEntry);
    
    if (added) {
      sourceLinks.set(target.name, linkEntry);
      this.count++;
      return true;
    }
    
    return false;
  }

  /**
   * Retrieve links associated with a source term
   * @param {Term} source - Source term to find links for
   * @returns {Array} - Array of associated links
   */
  get(source) {
    const sourceLinks = this.linkMap.get(source.name);
    return sourceLinks ? 
      Array.from(sourceLinks.values()).map(linkEntry => ({
        target: linkEntry.target,
        data: linkEntry.data
      })) : [];
  }

  /**
   * Remove a link between source and target terms
   * @param {Term} source - Source term
   * @param {Term} target - Target term
   * @returns {boolean} - True if link was successfully removed
   */
  remove(source, target) {
    const sourceLinks = this.linkMap.get(source.name);
    if (!sourceLinks || !sourceLinks.has(target.name)) {
      return false;
    }

    // Remove from linkMap
    const linkEntry = sourceLinks.get(target.name);
    this._removeFromLinkMap(sourceLinks, target.name, source.name);

    // Remove from bag
    this.linkBag.remove(linkEntry);
    this.count--;
    
    return true;
  }

  /**
   * Check if a link exists between source and target
   * @param {Term} source - Source term
   * @param {Term} target - Target term
   * @returns {boolean} - True if link exists
   */
  has(source, target) {
    const sourceLinks = this.linkMap.get(source.name);
    return sourceLinks ? sourceLinks.has(target.name) : false;
  }

  /**
   * Get all source terms in the layer
   * @returns {Array} - Array of source terms
   */
  getSources() {
    return Array.from(this.linkMap.keys())
      .map(name => this._getSourceTermByName(name))
      .filter(term => term !== undefined);
  }

  /**
   * Update data for an existing link
   * @param {Term} source - Source term
   * @param {Term} target - Target term
   * @param {Object} data - Updated link data
   * @returns {boolean} - True if link was successfully updated
   */
  update(source, target, data) {
    const sourceLinks = this.linkMap.get(source.name);
    if (!sourceLinks || !sourceLinks.has(target.name)) {
      return false;
    }

    // Update the link data in the entry
    const linkEntry = sourceLinks.get(target.name);
    linkEntry.data = { ...linkEntry.data, ...data };
    
    // If priority changed, need to update in bag
    if (data.priority !== undefined) {
      this._updatePriorityInBag(linkEntry);
    }
    
    return true;
  }

  /**
   * Clear all links from the layer
   */
  clear() {
    this.linkMap.clear();
    this.linkBag = new Bag(this.capacity); // Create a new empty bag
    this.count = 0;
  }

  /**
   * Get statistics about the layer
   * @returns {Object} - Statistics object
   */
  getStats() {
    return {
      linkCount: this.count,
      capacity: this.capacity,
      utilization: this.count / this.capacity,
      bagSize: this.linkBag.size,
      avgPriority: this.linkBag.getAveragePriority()
    };
  }

  /**
   * Get all links in priority order
   * @returns {Array} - Array of link entries sorted by priority
   */
  getLinksByPriority() {
    return this.linkBag.getItemsInPriorityOrder();
  }

  /**
   * Create a link entry object
   * @private
   * @param {Term} source - Source term
   * @param {Term} target - Target term
   * @param {Object} data - Link data including priority
   * @returns {Object} - The link entry object
   */
  _createLinkEntry(source, target, data) {
    return {
      id: this._createLinkId(source, target),
      source,
      target,
      data,
      budget: { priority: data.priority }  // Add budget object with priority for the Bag
    };
  }

  /**
   * Create a unique ID for a link between two terms
   * @private
   * @param {Term} source - Source term
   * @param {Term} target - Target term
   * @returns {string} - Unique link ID
   */
  _createLinkId(source, target) {
    return `${source.name}_${target.name}`;
  }

  /**
   * Get a source term by name (helper method)
   * @private
   * @param {string} name - Name of the source term
   * @returns {Term|undefined} - The term or undefined if not found
   */
  _getSourceTermByName(name) {
    // This is a simplified approach; in a real implementation, you'd have access
    // to the TermFactory or memory system to retrieve actual Term objects
    // For now, we'll just return a placeholder
    return { name };
  }

  /**
   * Remove the lowest priority link from the layer
   * @private
   */
  _removeLowestPriorityLink() {
    const lowestItem = this._findLowestPriorityItem();
    
    if (lowestItem) {
      this.linkBag.remove(lowestItem);
      this._removeFromLinkMap(
        this.linkMap.get(lowestItem.source.name), 
        lowestItem.target.name, 
        lowestItem.source.name
      );
      this.count--;
    }
  }

  /**
   * Find the lowest priority item in the bag
   * @private
   * @returns {Object|null} - The lowest priority item or null if none exists
   */
  _findLowestPriorityItem() {
    let lowestItem = null;
    let lowestPriority = Infinity;
    
    for (const [item, priority] of this.linkBag._items.entries()) {
      if (priority < lowestPriority) {
        lowestPriority = priority;
        lowestItem = item;
      }
    }
    
    return lowestItem;
  }

  /**
   * Ensure capacity by removing lowest priority link if needed
   * @private
   */
  _ensureCapacity() {
    if (this.count >= this.capacity) {
      this._removeLowestPriorityLink();
    }
  }

  /**
   * Get or create source map for a given source name
   * @private
   * @param {string} sourceName - Name of the source term
   * @returns {Map} - The source links map
   */
  _getOrCreateSourceMap(sourceName) {
    if (!this.linkMap.has(sourceName)) {
      this.linkMap.set(sourceName, new Map());
    }
    return this.linkMap.get(sourceName);
  }

  /**
   * Remove an entry from the link map
   * @private
   * @param {Map} sourceLinks - Source links map
   * @param {string} targetName - Name of the target term
   * @param {string} sourceName - Name of the source term
   */
  _removeFromLinkMap(sourceLinks, targetName, sourceName) {
    sourceLinks.delete(targetName);
    if (sourceLinks.size === 0) {
      this.linkMap.delete(sourceName);
    }
  }

  /**
   * Update priority of a link in bag
   * @private
   * @param {Object} linkEntry - Link entry to update
   */
  _updatePriorityInBag(linkEntry) {
    // Since we can't directly update priority in bag, we'll remove and re-add
    this.linkBag.remove(linkEntry);
    this.linkBag.add(linkEntry);
  }
}