import { mailtrapClient, SENDER, EMAIL_TEMPLATE_IDS, EMAIL_TEMPLATE_VARIABLES } from '../config/mailtrap.config.js';
import { ENV_VARS } from '../config/env.config.js';
import { getCurrentDateTime } from '../helpers/helper.js';

/**
 * Sends a verification email with a verification code to the specified email address.
 */
export const sendVerificationEmail = async (email, verificationCode) => {
  if (!ENV_VARS.MAILTRAP_TOKEN) {
    console.log(`\n======================================================`);
    console.log(`📧 [NO MAILTRAP CONFIGURED] Verification Code for ${email}: ${verificationCode}`);
    console.log(`======================================================\n`);
    return;
  }

  const recipients = [{ email }];
  try {
    const response = await mailtrapClient.send({
      from: SENDER,
      to: recipients,
      template_uuid: EMAIL_TEMPLATE_IDS.verification_email,
      template_variables: {
        ...EMAIL_TEMPLATE_VARIABLES,
        phone: verificationCode,
        signup_timestamp: getCurrentDateTime(),
      },
    });
    console.log('Verification email sent successfully', response);
  } catch (error) {
    console.error('Error sending verification email', error.message);
  }
};

/**
 * Sends a welcome email to the specified email address.
 */
export const sendWelcomeEmail = async (email, name) => {
  if (!ENV_VARS.MAILTRAP_TOKEN) return;

  const recipients = [{ email }];
  try {
    const response = await mailtrapClient.send({
      from: SENDER,
      to: recipients,
      template_uuid: EMAIL_TEMPLATE_IDS.welcome_email,
      template_variables: {
        ...EMAIL_TEMPLATE_VARIABLES,
        name,
      },
    });
    console.log('Welcome email sent successfully', response);
  } catch (error) {
    console.error('Error sending welcome email', error.message);
  }
};

/**
 * Sends a password reset email to the specified email address.
 */
export const sendPasswordResetEmail = async (email, url) => {
  if (!ENV_VARS.MAILTRAP_TOKEN) {
    console.log(`\n🔑 [NO MAILTRAP CONFIGURED] Password Reset URL for ${email}: ${url}\n`);
    return;
  }

  const recipients = [{ email }];
  try {
    const response = await mailtrapClient.send({
      from: SENDER,
      to: recipients,
      template_uuid: EMAIL_TEMPLATE_IDS.reset_password_email,
      template_variables: {
        ...EMAIL_TEMPLATE_VARIABLES,
        company_info_website_url: url,
        email: email,
        signup_timestamp: getCurrentDateTime(),
      },
    });
    console.log('Password reset email sent successfully', response);
  } catch (error) {
    console.error('Error sending password reset email', error.message);
  }
};

/**
 * Sends a password reset success email to the specified email address.
 */
export const sendPasswordResetSuccessEmail = async (email) => {
  if (!ENV_VARS.MAILTRAP_TOKEN) return;

  const recipients = [{ email }];
  try {
    const response = await mailtrapClient.send({
      from: SENDER,
      to: recipients,
      template_uuid: EMAIL_TEMPLATE_IDS.reset_password_confirmation_email,
      template_variables: {
        ...EMAIL_TEMPLATE_VARIABLES,
        email: email,
        confirmation_timestamp: getCurrentDateTime(),
      },
    });
    console.log('Password reset confirmation email sent successfully', response);
  } catch (error) {
    console.error('Error sending password reset confirmation email', error.message);
  }
};
