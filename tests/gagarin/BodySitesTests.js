describe('clinical:hl7-resources-body-sites', function () {
  var server = meteor();
  var client = browser(server);

  it('BodySites should exist on the client', function () {
    return client.execute(function () {
      expect(BodySites).to.exist;
    });
  });

  it('BodySites should exist on the server', function () {
    return server.execute(function () {
      expect(BodySites).to.exist;
    });
  });

});
