import 'urlpattern-polyfill';
import { RuleType } from './consts.js';

export class RenameDefinition {
    #type;
    #value;

    constructor(renameDefinition) {
        this.#verifyString(renameDefinition, 'type');
        if (renameDefinition.type !== RuleType.Fixed
                && renameDefinition.type !== RuleType.ElementId
                && renameDefinition.type !== RuleType.ClassId
                && renameDefinition.type !== RuleType.CustomQuery) {
            throw new Error(`Invalid argument: rename 'type' can be one of`
                            + ` '${RuleType.Fixed}', '${RuleType.ElementId}',`
                            + ` '${RuleType.ClassId}', '${RuleType.CustomQuery}'`);
        }

        this.#type = renameDefinition.type;

        this.#verifyString(renameDefinition, 'value');
        if (renameDefinition.value === '') {
            throw new Error('Invalid argument: value must not be empty')
        }

        this.#value = renameDefinition.value;
    }

    get type() { return this.#type; }
    get value() { return this.#value; }

    toJSON() {
        return {
            type: this.#type,
            value: this.#value
        };
    }

    #verifyString(element, field) {
        if (!Object.prototype.hasOwnProperty.call(element, field)) {
            throw new Error(`Invalid rename definition: missing '${field}'`);
        }

        if (typeof element[field] !== 'string') {
            throw new Error(`Invalid '${field}' value: string required`);
        }
    }
}

export class Rule {
    #matchPattern;
    #matchUrlPattern;
    #renameDefinition;

    constructor(rule) {
        this.#verifyMatchPattern(rule, 'match');
        this.#matchPattern = rule.match;
        this.#matchUrlPattern = new URLPattern(this.#matchPattern);

        this.#verifyExist(rule, 'rename');
        this.#renameDefinition = new RenameDefinition(rule.rename);
    }

    get matchPattern() { return this.#matchPattern; }
    get matchUrlPattern() { return this.#matchUrlPattern; }
    get renameDefinition() { return this.#renameDefinition; }

    toJSON() {
        return {
            match: this.#matchPattern,
            rename: this.#renameDefinition.toJSON()
        };
    }

    #verifyMatchPattern(element, field) {
        this.#verifyExist(element, field);

        const pattern = element[field];
        if (typeof pattern !== 'string') {
            throw new Error(`Invalid argument: '${field}' can only be a string`);
        }

        const validSchemeRegex = /^(http|https|ws|wss|ftp|data|file|\*)$/;
        const hostRegex = /^(\*|(\*\.)?([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+)$/;

        const parts = pattern.split("://");
        if (parts.length !== 2) {
            throw new Error(`Invalid match pattern: missing '://' separator`);
        }

        const [scheme, rest] = parts;
        if (!validSchemeRegex.test(scheme)) {
            throw new Error(`Invalid match pattern: scheme '${scheme}' is invalid. Only one `
                            + 'of [http, https, ws, wss, ftp, datafile, *] schemes are valid');
        };

        const pathStart = rest.indexOf('/');
        if (pathStart === -1) {
            throw new Error('Invalid match pattern: host must end with a slash');
        };

        const host = rest.substring(0, pathStart);
        if (scheme !== 'file' && host === '') {
            throw new Error(`Invalid match pattern: host part is optional only if `
                            + `the scheme is set to 'file'`);
        }

        if (host.indexOf(':') !== -1) {
            throw new Error(`Invalid match pattern: host must not contain a port`);
        }

        if (!hostRegex.test(host)) {
            throw new Error(`Invalid match pattern: invalid host: '${host}'. The host can `
                             + `either be a complete hostname, any  hostname ('*'), or a `
                             + `wildcard hostname (*. followed by the hostname)`);
        }
    }

    #verifyExist(element, field) {
        if (!Object.prototype.hasOwnProperty.call(element, field)) {
            throw new Error(`Invalid rule: missing '${field}'`);
        }
    }
}

export class RuleMap {
    #ruleMap;

    constructor() {
        this.#ruleMap = new Map();
    }

    static fromJson(jsonString) {
        var rules = new RuleMap();

        const jsonObject = JSON.parse(jsonString);
        for (let ruleId in jsonObject) {
            rules.set(ruleId, jsonObject[ruleId]);
        }

        return rules;
    }

    toJSON() {
        let obj = {};
        for (let [key, value] of this.#ruleMap) {
            if (!value) {
                throw new Error(`Rule '${key}' is invalid`);
            }

            obj[key] = value.toJSON();
        }

        return obj;
    }

    get patternMatches() {
        let patternMatches = new Set();
        for (let rule of this.#ruleMap.values()) {
            if (rule) {
                patternMatches.add(rule.matchPattern);
            }
        }

        return Array.from(patternMatches);
    }

    get(id) { return this.#ruleMap.get(id); }
    keys() { return this.#ruleMap.keys(); }
    remove(id) { this.#ruleMap.delete(id); }
    setNullRule(id) { this.#ruleMap.set(id, null); }

    getByUrl(url) {
        for (let rule of this.#ruleMap.values()) {
            if (rule.matchUrlPattern.test(url)) {
                return rule;
            }
        }

        return null;
    }

    addNewRule(id) {
        const current = [...this.#ruleMap.entries()];
        this.#ruleMap = new Map([[id, null], ...current]);
    }

    set(id, rule) {
        if (typeof id !== 'string') {
            throw new Error(`'Invalid argument: id can only be a string`);
        }

        if (rule instanceof Rule) {
            this.#ruleMap.set(id, rule);
        } else {
            this.#ruleMap.set(id, new Rule(rule));
        }
    }
}
