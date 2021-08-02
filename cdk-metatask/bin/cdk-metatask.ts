#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkMetataskStack } from '../lib/cdk-metatask-stack';

const app = new cdk.App();
new CdkMetataskStack(app, 'CdkMetataskStack');
