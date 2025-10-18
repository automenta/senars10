export class Answer {
  constructor(options = {}) {
    this.timeWeight = options.timeWeight ?? 0.5;
    this.confidenceWeight = options.confidenceWeight ?? 0.5;
    this.timeImportance = options.timeImportance ?? 'recency';
    this.referenceTime = options.referenceTime ?? Infinity;
    this.customRanking = options.customRanking || null;
    this.maxResults = options.maxResults ?? 1;
    this.punctuation = options.punctuation ?? '.';
  }

  static mostRecent(maxResults = 1, punctuation = '.') {
    return new Answer({ timeWeight: 1.0, confidenceWeight: 0.0, timeImportance: 'recency', referenceTime: Infinity, maxResults, punctuation });
  }

  static closestToTime(referenceTime, maxResults = 1, punctuation = '.') {
    return new Answer({ timeWeight: 1.0, confidenceWeight: 0.0, timeImportance: 'closest', referenceTime, maxResults, punctuation });
  }

  static highestConfidence(maxResults = 1, punctuation = '.') {
    return new Answer({ timeWeight: 0.0, confidenceWeight: 1.0, timeImportance: 'relevance', maxResults, punctuation });
  }

  static balanced(maxResults = 1, punctuation = '.') {
    return new Answer({ timeWeight: 0.5, confidenceWeight: 0.5, timeImportance: 'recency', maxResults, punctuation });
  }

  static withCustomRanking(rankingFunction, maxResults = 1, punctuation = '.') {
    return new Answer({ customRanking: rankingFunction, maxResults, punctuation });
  }

  getSelectionCriteria() {
    return { timeWeight: this.timeWeight, confidenceWeight: this.confidenceWeight, timeImportance: this.timeImportance, referenceTime: this.referenceTime, customRanking: this.customRanking };
  }
}