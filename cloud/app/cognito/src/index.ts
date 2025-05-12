import { Callback, Context, Handler } from 'aws-lambda/handler';
import { PreSignUpTriggerEvent, PreSignUpTriggerHandler } from 'aws-lambda/trigger/cognito-user-pool-trigger/pre-signup';
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';

const handlePreSignUp: PreSignUpTriggerHandler = async (event, context, callback) => {
  const email = event.request.userAttributes.email;

  // If email exists in user attributes, check if it's already been used
  if (email) {
    try {
      const client = new CognitoIdentityProviderClient({});
      // Query Cognito to find any existing users with this email
      const existingUsers = await client.send(new ListUsersCommand({
        UserPoolId: event.userPoolId,
        Filter: `email = "${email}"`,
      }));

      // If any users found with this email, reject the signup
      if (existingUsers.Users && existingUsers.Users.length > 0) {
        callback(new Error('EMAIL_EXISTS_EXCEPTION'));
        return;
      }
    } catch (error) {
      console.error('Error checking for existing user:', error);
      throw new Error('Error during signup validation');
    }
  }

  // Allow the signup to proceed
  return event;
};

export const handler: Handler = async (event: any, context: Context, callback: Callback) => {
  console.log('Received event:', event);

  // Route to specific handlers based on triggerSource
  if (event.triggerSource?.startsWith('PreSignUp_')) {
    return handlePreSignUp(event as PreSignUpTriggerEvent, context, callback);
  }

  throw new Error(`Unhandled trigger source: ${event.triggerSource}`);
};
