import { Layer } from './Layer.js';
import { Bag } from './Bag.js';

export class TermLayer extends Layer {
  constructor(config = {}) {
    super(config);
    
    this.linkBag = new Bag(this.capacity);
    this.linkMap = new Map();
    this.count = 0;
  }

  add(source, target, data = {}) {
    this._ensureCapacity();
    
    const sourceLinks = this._getOrCreateSourceMap(source.name);
    const priority = data.priority || 1;
    
    const linkEntry = this._createLinkEntry(source, target, { ...data, priority });
    
    const added = this.linkBag.add(linkEntry);
    
    if (added) {
      sourceLinks.set(target.name, linkEntry);
      this.count++;
      return true;
    }
    
    return false;
  }

  get(source) {
    const sourceLinks = this.linkMap.get(source.name);
    return sourceLinks ? 
      Array.from(sourceLinks.values()).map(linkEntry => ({
        target: linkEntry.target,
        data: linkEntry.data
      })) : [];
  }

  remove(source, target) {
    const sourceLinks = this.linkMap.get(source.name);
    if (!sourceLinks || !sourceLinks.has(target.name)) {
      return false;
    }

    const linkEntry = sourceLinks.get(target.name);
    this._removeFromLinkMap(sourceLinks, target.name, source.name);

    this.linkBag.remove(linkEntry);
    this.count--;
    
    return true;
  }

  has(source, target) {
    const sourceLinks = this.linkMap.get(source.name);
    return sourceLinks ? sourceLinks.has(target.name) : false;
  }

  getSources() {
    return Array.from(this.linkMap.keys())
      .map(name => this._getSourceTermByName(name))
      .filter(term => term !== undefined);
  }

  update(source, target, data) {
    const sourceLinks = this.linkMap.get(source.name);
    if (!sourceLinks || !sourceLinks.has(target.name)) {
      return false;
    }

    const linkEntry = sourceLinks.get(target.name);
    linkEntry.data = { ...linkEntry.data, ...data };
    
    if (data.priority !== undefined) {
      this._updatePriorityInBag(linkEntry);
    }
    
    return true;
  }

  clear() {
    this.linkMap.clear();
    this.linkBag = new Bag(this.capacity);
    this.count = 0;
  }

  getStats() {
    return {
      linkCount: this.count,
      capacity: this.capacity,
      utilization: this.count / this.capacity,
      bagSize: this.linkBag.size,
      avgPriority: this.linkBag.getAveragePriority()
    };
  }

  getLinksByPriority() {
    return this.linkBag.getItemsInPriorityOrder();
  }

  _createLinkEntry(source, target, data) {
    return {
      id: this._createLinkId(source, target),
      source,
      target,
      data,
      budget: { priority: data.priority }
    };
  }

  _createLinkId(source, target) {
    return `${source.name}_${target.name}`;
  }

  _getSourceTermByName(name) {
    return { name };
  }

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

  _ensureCapacity() {
    if (this.count >= this.capacity) {
      this._removeLowestPriorityLink();
    }
  }

  _getOrCreateSourceMap(sourceName) {
    if (!this.linkMap.has(sourceName)) {
      this.linkMap.set(sourceName, new Map());
    }
    return this.linkMap.get(sourceName);
  }

  _removeFromLinkMap(sourceLinks, targetName, sourceName) {
    sourceLinks.delete(targetName);
    if (sourceLinks.size === 0) {
      this.linkMap.delete(sourceName);
    }
  }

  _updatePriorityInBag(linkEntry) {
    this.linkBag.remove(linkEntry);
    this.linkBag.add(linkEntry);
  }
}