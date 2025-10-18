export class RuleSet {
    constructor(name, rules = []) {
        this._name = name;
        this._rules = new Set(rules);
        this._enabled = true;
        Object.freeze(this);
    }

    get name() {
        return this._name;
    }

    get rules() {
        return Array.from(this._rules);
    }

    get enabled() {
        return this._enabled;
    }

    get size() {
        return this._rules.size;
    }

    add(rule) {
        if (!rule || typeof rule.id !== 'string') return this;
        const newRules = new Set(this._rules);
        newRules.add(rule);
        return new RuleSet(this._name, newRules);
    }

    remove(ruleId) {
        const newRules = new Set(this._rules);
        for (const rule of newRules) {
            if (rule.id === ruleId) {
                newRules.delete(rule);
                break;
            }
        }
        return new RuleSet(this._name, newRules);
    }

    has(ruleId) {
        return Array.from(this._rules).some(rule => rule.id === ruleId);
    }

    enable() {
        return new RuleSet(this._name, this._rules);
    }

    disable() {
        return new RuleSet(this._name, this._rules);
    }

    filter(predicate) {
        return new RuleSet(`${this._name}_filtered`, this._rules.filter(predicate));
    }

    forEach(callback) {
        this._rules.forEach(callback);
    }

    map(callback) {
        return Array.from(this._rules).map(callback);
    }
}