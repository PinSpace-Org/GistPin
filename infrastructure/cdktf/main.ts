import { App } from 'cdktf';
import { VpcStack } from './stacks/vpc';
import { EksStack } from './stacks/eks';
const app = new App();
new VpcStack(app, 'gistpin-vpc');
new EksStack(app, 'gistpin-eks');
app.synth();
