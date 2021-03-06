const debug = require('debug')('schema');
const assert = require('assert');

const PartialOrder = require('./partial-order.js');

class Invocation {
  constructor(that) {
    Object.assign(this, that);
  }

  static fromJson(json) {
    return new Invocation(JSON.parse(json));
  }

  toString() {
    let name = this.method && this.method.name || this.id || '?';
    let args = this.arguments ? this.arguments.join(',') : '...';
    let id = this.index != null ? `#${this.index}` : '';
    return `${name}(${args})${id}`;
  }
}

class Schema {
  constructor(that) {
    Object.assign(this, that);
    for (let seq of this.sequences || [])
      seq.invocations = seq.invocations.map(i => new Invocation(i));
  }

  static fromJson(json) {
    return new Schema(JSON.parse(json));
  }

  static fromString(string, specJson) {
    debug(`parsing schema: %s`, string);
    let spec = JSON.parse(specJson);
    let json = string
      .replace(/\{([^}]*)\}/g, '{ "invocations": [ $1 ] }')
      .replace(/;|(\|\|)/g, ',')
      .replace(/(\w+)\(([^)]*)\)/g, '{ "method": { "name": "$1" }, "arguments": [ $2 ] }');
    let obj = JSON.parse(`{ "class": "${spec.class}", "parameters": [], "sequences": [ ${json} ], "order": [] }`);
    obj.sequences.forEach((seq,idx) => {
      seq.index = idx + 1;
      seq.invocations.forEach(inv => {
        let method = spec.methods.find(m => m.name === inv.method.name);
        Object.assign(inv.method, method);
      });
    });
    debug(obj);
    let schema = new Schema(obj);
    debug(`fromString(%s) = %s`, string, schema);
    return schema;
  }

  toString() {
    assert.equal(this.order.length, 0);
    return `${this.sequences.map(s => `{ ${s.invocations.join('; ')} }`).join(' || ')}`;
  }

  indexInvocations() {
    let count = 0;
    for (let sequence of this.sequences) {
      for (let invocation of sequence.invocations) {
        invocation.index = count++;
      }
    }
  }

  getProgramOrder() {
    let order = new PartialOrder();
    for (let sequence of this.sequences) {
      let predecessor;
      for (let invocation of sequence.invocations) {
        order.add(invocation);
        if (predecessor)
          order.sequence(predecessor, invocation);
        predecessor = invocation;
      }
    }

    for (let [i1,i2] of this.order) {
      let s1 = this.sequences.find(s => s.index === i1);
      let s2 = this.sequences.find(s => s.index === i2);
      assert.ok(s1 && s2);
      order.sequence(
        s1.invocations[s1.invocations.length-1],
        s2.invocations[0]);
    }

    return order;
  }
}

module.exports = {
  Invocation,
  Schema
};
