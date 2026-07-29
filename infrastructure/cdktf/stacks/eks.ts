import { Construct } from 'constructs';
import { TerraformStack } from 'cdktf';
import { AwsProvider,EksCluster } from '@cdktf/provider-aws';

export class EksStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    new AwsProvider(this, 'aws', { region: 'us-east-1' });
  }
}
