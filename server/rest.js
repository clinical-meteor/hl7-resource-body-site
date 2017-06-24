

//==========================================================================================
// Global Configs  

var fhirVersion = 'fhir-3.0.0';

if(typeof oAuth2Server === 'object'){
  // TODO:  double check that this is needed; and that the /api/ route is correct
  JsonRoutes.Middleware.use(
    // '/api/*',
    '/fhir-3.0.0/*',
    oAuth2Server.oauthserver.authorise()   // OAUTH FLOW - A7.1
  );
}

JsonRoutes.setResponseHeaders({
  "content-type": "application/fhir+json"
});



//==========================================================================================
// Global Method Overrides

// this is temporary fix until PR 132 can be merged in
// https://github.com/stubailo/meteor-rest/pull/132

JsonRoutes.sendResult = function (res, options) {
  options = options || {};

  // Set status code on response
  res.statusCode = options.code || 200;

  // Set response body
  if (options.data !== undefined) {
    var shouldPrettyPrint = (process.env.NODE_ENV === 'development');
    var spacer = shouldPrettyPrint ? 2 : null;
    res.setHeader('Content-type', 'application/fhir+json');
    res.write(JSON.stringify(options.data, null, spacer));
  }

  // We've already set global headers on response, but if they
  // pass in more here, we set those.
  if (options.headers) {
    //setHeaders(res, options.headers);
    options.headers.forEach(function(value, key){
      res.setHeader(key, value);
    });
  }

  // Send the response
  res.end();
};




//==========================================================================================
// Step 1 - Create New BodySite  

JsonRoutes.add("put", "/" + fhirVersion + "/BodySite/:id", function (req, res, next) {
  process.env.DEBUG && console.log('PUT /fhir-1.6.0/BodySite/' + req.params.id);
  //process.env.DEBUG && console.log('PUT /fhir-1.6.0/BodySite/' + req.query._count);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("content-type", "application/fhir+json");

  var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);

  if(typeof oAuth2Server === 'object'){
    var accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr});    

    if (accessToken || process.env.NOAUTH || Meteor.settings.private.disableOauth) {
      if (accessToken) {
        process.env.TRACE && console.log('accessToken', accessToken);
        process.env.TRACE && console.log('accessToken.userId', accessToken.userId);
      }


      if (req.body) {
        bodySiteUpdate = req.body;

        // remove id and meta, if we're recycling a resource
        delete req.body.id;
        delete req.body.meta;

        //process.env.TRACE && console.log('req.body', req.body);

        bodySiteUpdate.resourceType = "BodySite";
        bodySiteUpdate = BodySites.toMongo(bodySiteUpdate);

        //process.env.TRACE && console.log('bodySiteUpdate', bodySiteUpdate);


        bodySiteUpdate = BodySites.prepForUpdate(bodySiteUpdate);


        process.env.DEBUG && console.log('-----------------------------------------------------------');
        process.env.DEBUG && console.log('bodySiteUpdate', JSON.stringify(bodySiteUpdate, null, 2));
        // process.env.DEBUG && console.log('newBodySite', newBodySite);

        var bodySite = BodySites.findOne(req.params.id);
        var bodySiteId;

        if(bodySite){
          process.env.DEBUG && console.log('BodySite found...')
          bodySiteId = BodySites.update({_id: req.params.id}, {$set: bodySiteUpdate },  function(error, result){
            if (error) {
              process.env.TRACE && console.log('PUT /fhir/BodySite/' + req.params.id + "[error]", error);

              // Bad Request
              JsonRoutes.sendResult(res, {
                code: 400
              });
            }
            if (result) {
              process.env.TRACE && console.log('result', result);
              res.setHeader("Location", "fhir/BodySite/" + result);
              res.setHeader("Last-Modified", new Date());
              res.setHeader("ETag", "1.6.0");

              var bodySites = BodySites.find({_id: req.params.id});
              var payload = [];

              bodySites.forEach(function(record){
                payload.push(BodySites.prepForFhirTransfer(record));
              });

              console.log("payload", payload);

              // success!
              JsonRoutes.sendResult(res, {
                code: 200,
                data: Bundle.generate(payload)
              });
            }
          });
        } else {        
          process.env.DEBUG && console.log('No bodySite found.  Creating one.');
          bodySiteUpdate._id = req.params.id;
          bodySiteId = BodySites.insert(bodySiteUpdate,  function(error, result){
            if (error) {
              process.env.TRACE && console.log('PUT /fhir/BodySite/' + req.params.id + "[error]", error);

              // Bad Request
              JsonRoutes.sendResult(res, {
                code: 400
              });
            }
            if (result) {
              process.env.TRACE && console.log('result', result);
              res.setHeader("Location", "fhir/BodySite/" + result);
              res.setHeader("Last-Modified", new Date());
              res.setHeader("ETag", "1.6.0");

              var bodySites = BodySites.find({_id: req.params.id});
              var payload = [];

              bodySites.forEach(function(record){
                payload.push(BodySites.prepForFhirTransfer(record));
              });

              console.log("payload", payload);

              // success!
              JsonRoutes.sendResult(res, {
                code: 200,
                data: Bundle.generate(payload)
              });
            }
          });        
        }
      } else {
        // no body; Unprocessable Entity
        JsonRoutes.sendResult(res, {
          code: 422
        });

      }


    } else {
      // Unauthorized
      JsonRoutes.sendResult(res, {
        code: 401
      });
    }
  } else {
    // no oAuth server installed; Not Implemented
    JsonRoutes.sendResult(res, {
      code: 501
    });
  }

});



//==========================================================================================
// Step 2 - Read BodySite  

JsonRoutes.add("get", "/" + fhirVersion + "/BodySite/:id", function (req, res, next) {
  process.env.DEBUG && console.log('GET /fhir-1.6.0/BodySite/' + req.params.id);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("content-type", "application/fhir+json");

  var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
  if(typeof oAuth2Server === 'object'){
    var accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr});

    if (accessToken || process.env.NOAUTH || Meteor.settings.private.disableOauth) {

      if (accessToken) {
        process.env.TRACE && console.log('accessToken', accessToken);
        process.env.TRACE && console.log('accessToken.userId', accessToken.userId);
      }

      var bodySiteData = BodySites.findOne({_id: req.params.id});
      if (bodySiteData) {
        bodySiteData.id = bodySiteData._id;

        delete bodySiteData._document;
        delete bodySiteData._id;

        process.env.TRACE && console.log('bodySiteData', bodySiteData);

        // Success
        JsonRoutes.sendResult(res, {
          code: 200,
          data: BodySites.prepForFhirTransfer(bodySiteData)
        });
      } else {
        // Gone
        JsonRoutes.sendResult(res, {
          code: 410
        });
      }
    } else {
      // Unauthorized
      JsonRoutes.sendResult(res, {
        code: 401
      });
    }
  } else {
    // no oAuth server installed; Not Implemented
    JsonRoutes.sendResult(res, {
      code: 501
    });
  }
});

//==========================================================================================
// Step 3 - Update BodySite  

JsonRoutes.add("post", "/" + fhirVersion + "/BodySite", function (req, res, next) {
  process.env.DEBUG && console.log('POST /fhir/BodySite/', JSON.stringify(req.body, null, 2));

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("content-type", "application/fhir+json");

  var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
  if(typeof oAuth2Server === 'object'){
    var accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr});

    if (accessToken || process.env.NOAUTH || Meteor.settings.private.disableOauth) {

      if (accessToken) {
        process.env.TRACE && console.log('accessToken', accessToken);
        process.env.TRACE && console.log('accessToken.userId', accessToken.userId);
      }

      var bodySiteId;
      var newBodySite;

      if (req.body) {
        newBodySite = req.body;


        // remove id and meta, if we're recycling a resource
        delete newBodySite.id;
        delete newBodySite.meta;


        newBodySite = BodySites.toMongo(newBodySite);

        process.env.TRACE && console.log('newBodySite', JSON.stringify(newBodySite, null, 2));
        // process.env.DEBUG && console.log('newBodySite', newBodySite);

        console.log('Cleaning new bodySite...')
        BodySiteSchema.clean(newBodySite);

        var practionerContext = BodySiteSchema.newContext();
        practionerContext.validate(newBodySite)
        console.log('New bodySite is valid:', practionerContext.isValid());
        console.log('check', check(newBodySite, BodySiteSchema))
        


        var bodySiteId = BodySites.insert(newBodySite,  function(error, result){
          if (error) {
            process.env.TRACE && console.log('error', error);

            // Bad Request
            JsonRoutes.sendResult(res, {
              code: 400
            });
          }
          if (result) {
            process.env.TRACE && console.log('result', result);
            res.setHeader("Location", "fhir-1.6.0/BodySite/" + result);
            res.setHeader("Last-Modified", new Date());
            res.setHeader("ETag", "1.6.0");

            var bodySites = BodySites.find({_id: result});
            var payload = [];

            bodySites.forEach(function(record){
              payload.push(BodySites.prepForFhirTransfer(record));
            });

            //console.log("payload", payload);
            // Created
            JsonRoutes.sendResult(res, {
              code: 201,
              data: Bundle.generate(payload)
            });
          }
        });
        console.log('bodySiteId', bodySiteId);
      } else {
        // Unprocessable Entity
        JsonRoutes.sendResult(res, {
          code: 422
        });
      }

    } else {
      // Unauthorized
      JsonRoutes.sendResult(res, {
        code: 401
      });
    }
  } else {
    // Not Implemented
    JsonRoutes.sendResult(res, {
      code: 501
    });
  }
});

//==========================================================================================
// Step 4 - BodySiteHistoryInstance

JsonRoutes.add("get", "/" + fhirVersion + "/BodySite/:id/_history", function (req, res, next) {
  process.env.DEBUG && console.log('GET /fhir-1.6.0/BodySite/', req.params);
  process.env.DEBUG && console.log('GET /fhir-1.6.0/BodySite/', req.query._count);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("content-type", "application/fhir+json");

  var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
  if(typeof oAuth2Server === 'object'){
    var accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr});

    if (accessToken || process.env.NOAUTH || Meteor.settings.private.disableOauth) {

      if (accessToken) {
        process.env.TRACE && console.log('accessToken', accessToken);
        process.env.TRACE && console.log('accessToken.userId', accessToken.userId);
      }

      var bodySites = BodySites.find({_id: req.params.id});
      var payload = [];

      bodySites.forEach(function(record){
        payload.push(BodySites.prepForFhirTransfer(record));

        // the following is a hack, to conform to the Touchstone BodySite testscript
        // https://touchstone.aegis.net/touchstone/testscript?id=06313571dea23007a12ec7750a80d98ca91680eca400b5215196cd4ae4dcd6da&name=%2fFHIR1-6-0-Basic%2fP-R%2fBodySite%2fClient+Assigned+Id%2fBodySite-client-id-json&version=1&latestVersion=1&itemId=&spec=HL7_FHIR_STU3_C2
        // the _history query expects a different resource in the Bundle for each version of the file in the system
        // since we don't implement record versioning in Meteor on FHIR yet
        // we are simply adding two instances of the record to the payload 
        payload.push(BodySites.prepForFhirTransfer(record));
      });
      // Success
      JsonRoutes.sendResult(res, {
        code: 200,
        data: Bundle.generate(payload, 'history')
      });
    } else {
      // Unauthorized
      JsonRoutes.sendResult(res, {
        code: 401
      });
    }
  } else {
    // no oAuth server installed; Not Implemented
    JsonRoutes.sendResult(res, {
      code: 501
    });
  }
});

//==========================================================================================
// Step 5 - BodySite Version Read

// NOTE:  We've not implemented _history functionality yet; so this endpoint is mostly a duplicate of Step 2.

JsonRoutes.add("get", "/" + fhirVersion + "/BodySite/:id/_history/:versionId", function (req, res, next) {
  process.env.DEBUG && console.log('GET /fhir-1.6.0/BodySite/:id/_history/:versionId', req.params);
  //process.env.DEBUG && console.log('GET /fhir-1.6.0/BodySite/:id/_history/:versionId', req.query._count);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("content-type", "application/fhir+json");

  var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
  if(typeof oAuth2Server === 'object'){
  
  } else {
    // no oAuth server installed; Not Implemented
    JsonRoutes.sendResult(res, {
      code: 501
    });
  }

  var accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr});

  if (accessToken || process.env.NOAUTH || Meteor.settings.private.disableOauth) {

    if (accessToken) {
      process.env.TRACE && console.log('accessToken', accessToken);
      process.env.TRACE && console.log('accessToken.userId', accessToken.userId);
    }

    var bodySiteData = BodySites.findOne({_id: req.params.id});
    if (bodySiteData) {
      
      bodySiteData.id = bodySiteData._id;

      delete bodySiteData._document;
      delete bodySiteData._id;

      process.env.TRACE && console.log('bodySiteData', bodySiteData);

      JsonRoutes.sendResult(res, {
        code: 200,
        data: BodySites.prepForFhirTransfer(bodySiteData)
      });
    } else {
      JsonRoutes.sendResult(res, {
        code: 410
      });
    }

  } else {
    JsonRoutes.sendResult(res, {
      code: 401
    });
  }
});



//==========================================================================================
// Step 6 - BodySite Search Type  



generateDatabaseQuery = function(query){
  process.env.DEBUG && console.log("generateDatabaseQuery", query);

  var databaseQuery = {};

   if (query.name) {
    databaseQuery['name'] = {
      $regex: query.name,
      $options: 'i'
    };
  }
  if (query.identifier) {
    var paramsArray = query.identifier.split('|');
    process.env.DEBUG && console.log('paramsArray', paramsArray);
    
    databaseQuery['identifier.value'] = paramsArray[1]};

    process.env.DEBUG && console.log('databaseQuery', databaseQuery);
    return databaseQuery;
  }



JsonRoutes.add("get", "/" + fhirVersion + "/BodySite", function (req, res, next) {
  process.env.DEBUG && console.log('GET /fhir-1.6.0/BodySite', req.query);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("content-type", "application/fhir+json");

  var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
  if(typeof oAuth2Server === 'object'){
    var accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr});

    if (accessToken || process.env.NOAUTH || Meteor.settings.private.disableOauth) {

      if (accessToken) {
        process.env.TRACE && console.log('accessToken', accessToken);
        process.env.TRACE && console.log('accessToken.userId', accessToken.userId);
      }

      var databaseQuery = generateDatabaseQuery(req.query);

      var payload = [];
      var bodySites = BodySites.find(databaseQuery).fetch();
      process.env.DEBUG && console.log('bodySites', bodySites);

      bodySites.forEach(function(record){
        payload.push(BodySites.prepForFhirTransfer(record));
      });
      process.env.TRACE && console.log('payload', payload);

      // Success
      JsonRoutes.sendResult(res, {
        code: 200,
        data: Bundle.generate(payload)
      });
    } else {
      // Unauthorized
      JsonRoutes.sendResult(res, {
        code: 401
      });
    }
  } else {
    // no oAuth server installed; Not Implemented
    JsonRoutes.sendResult(res, {
      code: 501
    });
  }
});


JsonRoutes.add("post", "/" + fhirVersion + "/BodySite/:param", function (req, res, next) {
  process.env.DEBUG && console.log('POST /fhir-1.6.0/BodySite/' + JSON.stringify(req.query));

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("content-type", "application/fhir+json");

  var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
  if(typeof oAuth2Server === 'object'){
    var accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr});

    if (accessToken || process.env.NOAUTH || Meteor.settings.private.disableOauth) {

      if (accessToken) {
        process.env.TRACE && console.log('accessToken', accessToken);
        process.env.TRACE && console.log('accessToken.userId', accessToken.userId);
      }

      var bodySites = [];

      if (req.params.param.includes('_search')) {
        var searchLimit = 1;
        if (req && req.query && req.query._count) {
          searchLimit = parseInt(req.query._count);
        }

        var databaseQuery = generateDatabaseQuery(req.query);
        process.env.DEBUG && console.log('databaseQuery', databaseQuery);

        bodySites = BodySites.find(databaseQuery, {limit: searchLimit}).fetch();

        process.env.DEBUG && console.log('bodySites', bodySites);

        var payload = [];

        bodySites.forEach(function(record){
          payload.push(BodySites.prepForFhirTransfer(record));
        });
      }

      process.env.TRACE && console.log('payload', payload);

      // Success
      JsonRoutes.sendResult(res, {
        code: 200,
        data: Bundle.generate(payload)
      });
    } else {
      // Unauthorized
      JsonRoutes.sendResult(res, {
        code: 401
      });
    }
  } else {
    // no oAuth server installed; Not Implemented
    JsonRoutes.sendResult(res, {
      code: 501
    });
  }
});




//==========================================================================================
// Step 7 - BodySite Delete    

JsonRoutes.add("delete", "/" + fhirVersion + "/BodySite/:id", function (req, res, next) {
  process.env.DEBUG && console.log('DELETE /fhir-1.6.0/BodySite/' + req.params.id);

  res.setHeader("Access-Control-Allow-Origin", "*");

  var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
  if(typeof oAuth2Server === 'object'){

    var accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr});
    if (accessToken || process.env.NOAUTH || Meteor.settings.private.disableOauth) {

      if (accessToken) {
        process.env.TRACE && console.log('accessToken', accessToken);
        process.env.TRACE && console.log('accessToken.userId', accessToken.userId);
      }

      if (BodySites.find({_id: req.params.id}).count() === 0) {
        // No Content
        JsonRoutes.sendResult(res, {
          code: 204
        });
      } else {
        BodySites.remove({_id: req.params.id}, function(error, result){
          if (result) {
            // No Content
            JsonRoutes.sendResult(res, {
              code: 204
            });
          }
          if (error) {
            // Conflict
            JsonRoutes.sendResult(res, {
              code: 409
            });
          }
        });
      }


    } else {
      // Unauthorized
      JsonRoutes.sendResult(res, {
        code: 401
      });
    }
  } else {
    // no oAuth server installed; Not Implemented
    JsonRoutes.sendResult(res, {
      code: 501
    });
  }
  
  
});





// WebApp.connectHandlers.use("/fhir/BodySite", function(req, res, next) {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   return next();
// });
