"use strict";

const _ = require("lodash");

class LambdaArn {
  constructor(serverless, options) {
    this.hooks = {
      "after:package:finalize": () => updateLambdaVersion(serverless)
    };
  }
}

const getArnAndVersion = (resources, funcNormName) => {
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
};

const getResourcesWAssoc = resources =>
  _.pickBy(
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

const updateLambdaVersion = serverless => {
  const funcNormName = "RewriteLambdaFunction";
  const resources =
    serverless.service.provider.compiledCloudFormationTemplate.Resources;
  const lambdaArns = getResourcesWAssoc(resources);

  serverless.cli.log(
    `lambdaArns: ${JSON.stringify(
      serverless.service.provider.compiledCloudFormationTemplate.Resources
    )}`
  );

  _.forEach(lambdaArns, (value, key1) => {
    serverless.cli.log(`Key1: ${JSON.stringify(key1)}`);
    serverless.service.provider.compiledCloudFormationTemplate.Resources[
      key1
    ] = {};

    const associations =
      resources[key1].Properties.DistributionConfig.DefaultCacheBehavior
        .LambdaFunctionAssociations;

    _.forEach(associations, (association, key2, associations) => {
      const arn = association.LambdaFunctionARN;
      const versionRef = getArnAndVersion(resources, arn);
      if (arn && versionRef) {
        serverless.cli.log(`Key2: ${JSON.stringify(key2)}`);
        serverless.service.provider.compiledCloudFormationTemplate.Resources[
          key1
        ].Properties.DistributionConfig.DefaultCacheBehavior.LambdaFunctionAssociations[
          key2
        ].LambdaFunctionARN = versionRef;
        serverless.cli.log(`getLambdaArns: ${JSON.stringify(versionRef)}`);
      }
    });
  });
};

module.exports = LambdaArn;
