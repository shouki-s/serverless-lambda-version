"use strict";

const _ = require("lodash");

class LambdaArn {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.hooks = {
      "before:package:finalize": this.updateLambdaVersion.bind(this)
    };
  }

  updateLambdaVersion() {
    const resources = this.serverless.service.resources.Resources;
    const compiledResources = this.serverless.service.provider
      .compiledCloudFormationTemplate.Resources;
    const lambdaArns = this.getResourcesWLambdaAssoc(resources);

    _.forEach(lambdaArns, (value, key1) => {
      const associations =
        value.Properties.DistributionConfig.DefaultCacheBehavior
          .LambdaFunctionAssociations;

      _.forEach(associations, (association, key2) => {
        let arn = association.LambdaFunctionARN;
        const versionRef = this.getArnAndVersion(compiledResources, arn);
        if (arn && versionRef) {
          association.LambdaFunctionARN = versionRef;
        }
      });
    });
  }

  getArnAndVersion(resources, funcNormName) {
    const key = _.findKey(
      resources,
      r =>
        r.Type === "AWS::Lambda::Version" &&
        r.Properties.FunctionName.Ref === funcNormName
    );

    return key
      ? {
          "Fn::Join": [
            "",
            [
              { "Fn::GetAtt": [funcNormName, "Arn"] },
              ":",
              { "Fn::GetAtt": [key, "Version"] }
            ]
          ]
        }
      : undefined;
  }

  getResourcesWLambdaAssoc(resources) {
    return _.pickBy(
      resources,
      r =>
        r.Type === "AWS::CloudFront::Distribution" &&
        r.Properties.DistributionConfig &&
        r.Properties.DistributionConfig.DefaultCacheBehavior &&
        r.Properties.DistributionConfig.DefaultCacheBehavior
          .LambdaFunctionAssociations &&
        r.Properties.DistributionConfig.DefaultCacheBehavior
          .LambdaFunctionAssociations
    );
  }
}

module.exports = LambdaArn;
