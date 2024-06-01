import 'urlpattern-polyfill';
import { RenameDefinition, Rule, RuleMap } from '../src/rules.js';
import { RuleType } from '../src/consts.js';
import { expect } from 'chai';
import { describe, beforeEach, it } from 'mocha';

describe('RenameDefinition Tests', function() {
    it('should fail when missing type', function() {
        expect(() => { new RenameDefinition({}) })
            .to.throw('Invalid renameasdasd definition: missing \'type\'');
    });

    it('should fail when type is not string', function() {
        expect(() => { new RenameDefinition({ type: 5 }) })
            .to.throw('Invalid \'type\' value: string required');
    });

    it('should fail when rename type is invalid', function() {
        expect(() => { new RenameDefinition({ type: "type", value: "value" }) })
            .to.throw('Invalid argument: rename \'type\' can be one of \'fixed\','
                      + ' \'element_id\' ,\'class_id\'');
    });

    it('should fail when missing value', function() {
        expect(() => { new RenameDefinition({ type: "fixed" }) })
            .to.throw('Invalid rename definition: missing \'value\'');
    });

    it('should fail when value is not string', function() {
        expect(() => { new RenameDefinition({ type: "fixed", value: 5 }) })
            .to.throw('Invalid \'value\' value: string required');
    });

    it('should fail when value is empty', function() {
        expect(() => { new RenameDefinition({ type: "fixed", value: "" }) })
            .to.throw('Invalid argument: value must not be empty');
    });

    it('should pass when providing valid rename definitions', function() {
        let r1 = new RenameDefinition({ type: RuleType.Fixed, value: "value" });
        expect(r1.type).to.equal(RuleType.Fixed);
        expect(r1.value).to.equal("value");
        expect(r1.toJSON()).to.deep.equal( {type: RuleType.Fixed, value: "value" });

        let r2 = new RenameDefinition({ type: RuleType.ElementId, value: "value" });
        expect(r2.type).to.equal(RuleType.ElementId);
        expect(r2.value).to.equal("value");
        expect(r2.toJSON()).to.deep.equal( {type: RuleType.ElementId, value: "value" });

        let r3 = new RenameDefinition({ type: RuleType.ClassId, value: "value" });
        expect(r3.type).to.equal(RuleType.ClassId);
        expect(r3.value).to.equal("value");
        expect(r3.toJSON()).to.deep.equal( {type: RuleType.ClassId, value: "value" });
    });
});

describe('Rule Tests', function() {
    it('should fail when missing match', function() {
        expect(() => { new Rule({}) })
            .to.throw('Invalid rule: missing \'match\'');
    });

    it('should fail when match is not a string', function() {
        expect(() => { new Rule({ match: 5 }) })
            .to.throw('Invalid argument: \'match\' can only be a string');
    });

    it('should fail when match does not have :// separator', function() {
        expect(() => { new Rule({ match: "invalid" }) })
            .to.throw(`Invalid match pattern: missing '://' separator`);
    });

    it('should fail when match scheme is invalid', function() {
        expect(() => { new Rule({ match: "bad://" }) })
            .to.throw(`Invalid match pattern: scheme 'bad' is invalid. Only one `
                      + 'of [http, https, ws, wss, ftp, datafile, *] schemes are valid');
    });

    it('should fail when match host does not end with a slash', function() {
        expect(() => { new Rule({ match: "http://host.com" }) })
            .to.throw(`Invalid match pattern: host must end with a slash`);
    });

    it('should fail when match has no host and scheme is not file', function() {
        expect(() => { new Rule({ match: "http:///host" }) })
            .to.throw(`Invalid match pattern: host part is optional only if `
                      + `the scheme is set to 'file'`);
    });

    it('should fail when match host contains a port', function() {
        expect(() => { new Rule({ match: "http://host.com:1234/" }) })
            .to.throw(`Invalid match pattern: host must not contain a port`);
    });

    it('should fail when match host is invalid', function() {
        for (let host of ["host*.com", "*host.com", "host.*.com", ".", ".com"]) {
            expect(() => { new Rule({ match: `http://${host}/` }) })
                .to.throw(`Invalid match pattern: invalid host: '${host}'. The host can `
                          + `either be a complete hostname, any  hostname ('*'), or a `
                          + `wildcard hostname (*. followed by the hostname)`);
        }
    });

    it('should fail when missing rename', function() {
        expect(() => { new Rule({ match: "https://host.com/" }) })
            .to.throw('Invalid rule: missing \'rename\'');
    });

    it('should pass when providing valid rule', function() {
        const rename = { type: RuleType.Fixed, value: "value" };

        for (let host of ["*", "host.com", "*.host.com", "com", "*.com", "a.host.com"]) {
            let match = `https://${host}/`;
            let rule = new Rule({ match: match, rename: rename });
            expect(rule.toJSON()).to.deep.equal({ match: match, rename: rename });
        }
    });
});

describe('RuleMap Tests', function() {
    let ruleMap;
    let match_1 = 'https://test1.com/';
    let match_2 = 'https://test2.com/';
    let rename = { type: "fixed", value: "val", };

    let test_rule_1 = new Rule({ match: match_1, rename: rename });
    let test_rule_1_json = { match: match_1, rename: rename };
    let test_rule_2 = new Rule({ match: match_2, rename: rename });
    let test_rule_2_json = { match: match_2, rename: rename };

    beforeEach(() => {
        ruleMap = new RuleMap();
    });

    it('should initialize with an empty map', () => {
        expect([...ruleMap.keys()]).to.be.empty;
    });

    it('should create a RuleMap from JSON', () => {
        const json = `{
          "rule1": {
              "match": "${match_1}",
              "rename": {
                  "type": "fixed",
                  "value": "val"
              }
          },
          "rule2": {
              "match": "${match_2}",
              "rename": {
                  "type": "fixed",
                  "value": "val"
              }
          }
        }`;

        const rules = RuleMap.fromJson(json);
        expect(rules.get('rule1').toJSON()).to.deep.equal(test_rule_1_json);
        expect(rules.get('rule2').toJSON()).to.deep.equal(test_rule_2_json);
    });

    it('should convert to JSON', () => {
        ruleMap.set('rule1', test_rule_1);
        ruleMap.set('rule2', test_rule_2);

        expect(ruleMap.toJSON()).to.deep.equal({
            rule1: test_rule_1_json,
            rule2: test_rule_2_json,
        });
    });

    it('should throw error when converting to JSON with invalid rule', () => {
        ruleMap.set('rule1', test_rule_1);
        ruleMap.setNullRule('rule2');
        expect(() => ruleMap.toJSON()).to.throw(Error, `Rule 'rule2' is invalid`);
    });

    it('should return pattern matches', () => {
        ruleMap.set('rule1', test_rule_1);
        ruleMap.set('rule2', test_rule_2);
        expect(ruleMap.patternMatches).to.have.members([match_1, match_2]);
    });

    it('should get rule by id', () => {
        ruleMap.set('rule1', test_rule_1);
        expect(ruleMap.get('rule1')).to.equal(test_rule_1);
    });

    it('should remove rule by id', () => {
        ruleMap.set('rule1', test_rule_1);
        ruleMap.remove('rule1');
        expect(ruleMap.get('rule1')).to.be.undefined;
    });

    it('should add a new rule with null value', () => {
        ruleMap.addNewRule('newRule');
        expect(ruleMap.get('newRule')).to.be.null;
    });

    it('should get rule by URL', () => {
        ruleMap.set('rule1', test_rule_1);
        expect(ruleMap.getByUrl(match_1)).to.equal(test_rule_1);
    });

    it('should throw error for non-string id in set method', () => {
        expect(() => ruleMap.set(123, test_rule_1))
            .to.throw(Error, `'Invalid argument: id can only be a string`);
    });

    it('should convert plain object to Rule instance in set method', () => {
        ruleMap.set('rule1', test_rule_1_json);
        expect(ruleMap.get('rule1')).to.be.instanceOf(Rule);
    });
});
