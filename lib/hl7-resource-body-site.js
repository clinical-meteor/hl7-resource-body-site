if(Package['clinical:autopublish']){
  console.log("*****************************************************************************")
  console.log("HIPAA WARNING:  Your app has the 'clinical-autopublish' package installed.");
  console.log("Any protected health information (PHI) stored in this app should be audited."); 
  console.log("Please consider writing secure publish/subscribe functions and uninstalling.");  
  console.log("");  
  console.log("meteor remove clinical:autopublish");  
  console.log("");  
}
if(Package['autopublish']){
  console.log("*****************************************************************************")
  console.log("HIPAA WARNING:  DO NOT STORE PROTECTED HEALTH INFORMATION IN THIS APP. ");  
  console.log("Your application has the 'autopublish' package installed.  Please uninstall.");
  console.log("");  
  console.log("meteor remove autopublish");  
  console.log("meteor add clinical:autopublish");  
  console.log("");  
}






// create the object using our BaseModel
BodySite = BaseModel.extend();

//Assign a collection so the object knows how to perform CRUD operations
BodySite.prototype._collection = BodySites;

// Create a persistent data store for addresses to be stored.
// HL7.Resources.Patients = new Mongo.Collection('HL7.Resources.Patients');
BodySites = new Mongo.Collection('BodySites');

//Add the transform to the collection since Meteor.users is pre-defined by the accounts package
BodySites._transform = function (document) {
  return new BodySite(document);
};



BodySiteSchema = new SimpleSchema([
  BaseSchema,
  DomainResourceSchema,
  {
  "resourceType" : {
    type: String,
    defaultValue: "BodySite"
  },
  "identifier" : {
    optional: true,
    type: [ IdentifierSchema ]
  }, 
  "active" : {
    optional: true,
    type: Boolean
  }, 
  "code" : { 
    optional: true,
    type: CodeableConceptSchema 
  }, 
  "qualifier" : {
    optional: true,
    type: [ CodeableConceptSchema ]
  }, 
  "description" : {
    optional: true,
    type: String
  }, 
  "image" : {
    optional: true,
    type: [ AttachmentSchema ]
  }, 
  "patient" : { 
    type: ReferenceSchema 
  } 
}]);
BodySites.attachSchema(BodySiteSchema);






//=================================================================
// FHIR Methods

BodySites.fetchBundle = function (query, parameters, callback) {
  var bodySiteArray = BodySites.find(query, parameters, callback).map(function(bodySite){
    bodySite.id = bodySite._id;
    delete bodySite._document;
    return bodySite;
  });

  // console.log("bodySiteArray", bodySiteArray);

  var result = Bundle.generate(bodySiteArray);

  // console.log("result", result.entry[0]);

  return result;
};


/**
 * @summary This function takes a FHIR resource and prepares it for storage in Mongo.
 * @memberOf BodySites
 * @name toMongo
 * @version 1.6.0
 * @returns { BodySite }
 * @example
 * ```js
 *  let bodySites = BodySites.toMongo('12345').fetch();
 * ```
 */

BodySites.toMongo = function (originalBodySite) {
  var mongoRecord;

  // if (originalBodySite.identifier) {
  //   originalBodySite.identifier.forEach(function(identifier){
  //     if (identifier.period) {
  //       if (identifier.period.start) {
  //         var startArray = identifier.period.start.split('-');
  //         identifier.period.start = new Date(startArray[0], startArray[1] - 1, startArray[2]);
  //       }
  //       if (identifier.period.end) {
  //         var endArray = identifier.period.end.split('-');
  //         identifier.period.end = new Date(startArray[0], startArray[1] - 1, startArray[2]);
  //       }
  //     }
  //   });
  // }

  return originalBodySite;
};


/**
 * @summary Similar to toMongo(), this function prepares a FHIR record for storage in the Mongo database.  The difference being, that this assumes there is already an existing record.
 * @memberOf BodySites
 * @name prepForUpdate
 * @version 1.6.0
 * @returns { Object }
 * @example
 * ```js
 *  let bodySites = BodySites.findMrn('12345').fetch();
 * ```
 */

BodySites.prepForUpdate = function (bodySite) {

  if (bodySite.identifier && bodySite.identifier[0]) {
    process.env.TRACE && console.log("bodySite.identifier", bodySite.identifier);

    bodySite.identifier.forEach(function(identifier){
      identifier.resourceType = "HumanName";
    });
  }

  if (bodySite.telecom && bodySite.telecom[0]) {
    process.env.TRACE && console.log("bodySite.telecom", bodySite.telecom);
    bodySite.telecom.forEach(function(telecom){
      telecom.resourceType = "ContactPoint";
    });
  }

  if (bodySite.address && bodySite.address[0]) {
    process.env.TRACE && console.log("bodySite.address", bodySite.address);
    bodySite.address.forEach(function(address){
      address.resourceType = "Address";
    });
  }

  if (bodySite.contact && bodySite.contact[0]) {
    process.env.TRACE && console.log("bodySite.contact", bodySite.contact);

    bodySite.contact.forEach(function(contact){
      if (contact.name) {
        contact.name.resourceType = "HumanName";
      }

      if (contact.telecom && contact.telecom[0]) {
        contact.telecom.forEach(function(telecom){
          telecom.resourceType = "ContactPoint";
        });
      }

      if (contact.address) {
        contact.address.resourceType = "HumanName";
      }

    });
  }

  return bodySite;
};


/**
 * @summary Scrubbing the bodySite; make sure it conforms to v1.6.0
 * @memberOf BodySites
 * @name scrub
 * @version 1.2.3
 * @returns {Boolean}
 * @example
 * ```js
 *  let bodySites = BodySites.findMrn('12345').fetch();
 * ```
 */

BodySites.prepForFhirTransfer = function (bodySite) {
  process.env.DEBUG && console.log("BodySites.prepForBundle()");


  if (bodySite.telecom && bodySite.telecom[0]) {
    process.env.TRACE && console.log("bodySite.telecom", bodySite.telecom);
    bodySite.telecom.forEach(function(telecom){
      delete telecom.resourceType;
    });
  }

  if (bodySite.address && bodySite.address[0]) {
    process.env.TRACE && console.log("bodySite.address", bodySite.address);
    bodySite.address.forEach(function(address){
      delete address.resourceType;
    });
  }

  if (bodySite.contact && bodySite.contact[0]) {
    process.env.TRACE && console.log("bodySite.contact", bodySite.contact);

    bodySite.contact.forEach(function(contact){

      console.log("contact", contact);


      if (contact.name && contact.name.resourceType) {
        process.env.TRACE && console.log("bodySite.contact.name", contact.name);
        delete contact.name.resourceType;
      }

      if (contact.telecom && contact.telecom[0]) {
        contact.telecom.forEach(function(telecom){
          delete telecom.resourceType;
        });
      }


      if (contact.address && contact.address.resourceType) {
        delete contact.address.resourceType;
      }
    });
  }

  console.log("BodySites.prepForBundle()", bodySite);

  return bodySite;
};

// /**
//  * @summary The displayed name of the bodySite.
//  * @memberOf BodySite
//  * @name displayName
//  * @version 1.2.3
//  * @returns {Boolean}
//  * @example
//  * ```js
//  * ```
//  */

// BodySite.prototype.displayName = function () {
//   if (this.name && this.name[0]) {
//     return this.name[0].text;
//   }
// };
