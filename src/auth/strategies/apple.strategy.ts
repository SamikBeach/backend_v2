import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { AuthProvider } from '../../user/entities/user.entity';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  private readonly logger = new Logger(AppleStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID'), // Your app's bundle ID or Services ID
      teamID: configService.get<string>('APPLE_TEAM_ID'), // Your Apple Developer Team ID
      keyID: configService.get<string>('APPLE_KEY_ID'), // The Key ID of the p8 file
      privateKeyString: configService
        .get<string>('APPLE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n'), // Contents of your .p8 file
      callbackURL: configService.get<string>('APPLE_CALLBACK_URL'), // e.g., https://yourdomain.com/auth/apple/callback
      scope: ['name', 'email'], // Request name and email
      passReqToCallback: false, // Set to true if you need to access the request object in the verify callback
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile, // This profile should contain the decoded id_token from Apple
    done: VerifyCallback,
  ): Promise<any> {
    this.logger.debug(`AppleStrategy profile: ${JSON.stringify(profile)}`);

    const appleUserId = profile.id; // 'sub' claim from Apple's id_token
    const email = profile.email;
    // Apple only provides name on the first authentication.
    // passport-apple might parse it into profile.name if available.
    const firstName = profile.name?.firstName;
    const lastName = profile.name?.lastName;
    let fullName: string | undefined = undefined;

    if (firstName && lastName) {
      fullName = `${firstName} ${lastName}`;
    } else if (firstName) {
      fullName = firstName;
    }

    if (!appleUserId || !email) {
      this.logger.error(
        'Apple profile did not contain expected id (sub) or email.',
        profile,
      );
      return done(
        new UnauthorizedException(
          'Failed to retrieve necessary user information from Apple.',
        ),
        null,
      );
    }

    try {
      // The `profile` from passport-apple might directly give us what we need.
      // We need to ensure this matches the structure expected by `validateOAuthUser`.
      // Our `validateOAuthUser` expects an object with `providerId`, `email`, `fullName?`.
      const oauthUser = {
        providerId: appleUserId,
        email: email,
        fullName: fullName,
        // accessToken is the original id_token from Apple if needed,
        // though passport-apple has already verified it.
        // For consistency with OAuthUser interface, we can pass something here or adjust.
        // For now, let's pass the accessToken received by the strategy.
        accessToken: accessToken, // Or perhaps the id_token if accessible and needed by validateOAuthUser
      };

      // We will use authService.validateOAuthUser to find or create the user.
      // This method is already designed to handle various OAuth providers.
      const user = await this.authService.validateOAuthUser(
        oauthUser,
        AuthProvider.APPLE,
      );

      if (!user) {
        return done(
          new UnauthorizedException(
            'Could not validate or create user for Apple Sign In.',
          ),
          null,
        );
      }
      return done(null, user);
    } catch (error) {
      this.logger.error('Error during Apple OAuth user validation', error);
      return done(error, null);
    }
  }
}
