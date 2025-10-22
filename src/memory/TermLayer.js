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
    // Check if we've reached capacity and need to remove lowest priority link
    if (this.count >= this.capacity) {
      // Remove the lowest priority link
      this._removeLowestPriorityLink();
    }

    // Initialize source map if it doesn't exist
    if (!this.linkMap.has(source.name)) {
      this.linkMap.set(source.name, new Map());
    }

    // Update or create the link
    const sourceLinks = this.linkMap.get(source.name);
    const priority = data.priority || 1; // Default priority
    
    // Add to the bag with its priority
    const linkId = this._createLinkId(source, target);
    const linkEntry = {
      id: linkId,
      source,
      target,
      data: { ...data, priority }
    };
    
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
    if (!sourceLinks) return [];

    return Array.from(sourceLinks.values()).map(linkEntry => ({
      target: linkEntry.target,
      data: linkEntry.data
    }));
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
    sourceLinks.delete(target.name);
    
    if (sourceLinks.size === 0) {
      this.linkMap.delete(source.name);
    }

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
    return Array.from(this.linkMap.keys()).map(name => 
      this._getSourceTermByName(name)
    ).filter(term => term !== undefined);
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
      // Since we can't directly update priority in bag, we'll remove and re-add
      this.linkBag.remove(linkEntry);
      this.linkBag.add(linkEntry);
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
    // Find the lowest priority link in the bag
    const lowestPriorityItem = this.linkBag.peek(); // Since peek gets highest, we need the opposite
    
    // To get the lowest priority item, we need to sort all items by priority
    const allItems = [...this.linkBag._items.entries()]
      .sort((a, b) => a[1] - b[1]); // Sort by priority ascending
    
    if (allItems.length > 0) {
      const [lowestItem, priority] = allItems[0];
      
      // Remove from bag
      this.linkBag.remove(lowestItem);
      
      // Remove from linkMap
      const sourceName = lowestItem.source.name;
      const targetName = lowestItem.target.name;
      
      const sourceLinks = this.linkMap.get(sourceName);
      if (sourceLinks) {
        sourceLinks.delete(targetName);
        if (sourceLinks.size === 0) {
          this.linkMap.delete(sourceName);
        }
      }
      
      this.count--;
    }
  }
}