#!/usr/bin/env node

'use strict';

const Path = require('path');
const _ = require('lodash');

var neo4j = require('neo4j-driver').v1;

var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic(process.env.NEO4J_UID, process.env.NEO4J_PWD));

driver.onCompleted = function() {
  console.log('Successfully connected to Neo4J');
};

driver.onError = function(error) {
  console.log('Neo4J Driver instantiation failed', error);
};

var session = driver.session();


require('seneca')()
  .use('seneca-amqp-transport')
  .add('cmd:linkNode,cuid:*,linkTo:*,linkType:*,linkProps:*', function(message, done) {
    var properties = "{ ";
    var count = 0;
    _.forOwn(message.linkProps, function(value, key) {
      if (count > 0) properties += ", ";
      properties += key + ":'" + value + "'";
      count++;
    });
    properties += " }";
    var queryString = "MATCH (a { cuid:'" + message.cuid + "'}), (b { cuid:'" + message.linkTo + "'}) MERGE (a)-[:" + message.linkType + " " + properties + "]->(b)";
    console.log(queryString);
    session
      .run(queryString)
      .then(function(result) {
        session.close();
        var status = "Successfully linked Node " + message.cuid + " to Node " + message.linkTo;
        return done(null, {
          status
        });
      })
      .catch(function(error) {
        console.log(error);
      });
  })
  .listen({
    type: 'amqp',
    pin: 'cmd:linkNode,cuid:*,linkTo:*,linkType:*,linkProps:*',
    url: process.env.AMQP_URL
  });
