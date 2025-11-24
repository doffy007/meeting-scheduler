import { type Context } from 'hono';
import { Service as UserService } from '../user/service.js';
import * as api from '../api/util.js';

export const UserController = {
  async SignIn(c: Context) {
    let body;
    try {
      body = await c.req.json();
    } catch {
      return api.Abort(c, 400, null, 'Invalid JSON body');
    }

    const { username, password } = body;
    if (!username || !password) {
      return api.Abort(c, 400, null, 'Username and password required');
    }

    try {
      const resp = await UserService.signIn(username, password);
      const device = c.req.header('User-Agent') || 'Unknown';
      const token = await UserService.createTokenIfNotExisting(resp.user.id, resp.user.username, device);

      return c.json({
        token,
        user: {
          id: resp.user.id,
          name: resp.user.name,
          username: resp.user.username,
          email: resp.user.email,
          role: resp.user.role,
          phoneNumber: resp.user.phone_number,
        },
      });
    } catch (err: any) {
      if (err.message === 'user not found') return api.Abort(c, 404, err, 'User not found');
      if (err.message === 'invalid password') return api.Abort(c, 401, err, 'Invalid password');
      return api.Abort(c, 500, err, 'Failed to sign in');
    }
  },

  async CreateUser(c: Context) {
    let body;
    try {
      body = await c.req.json();
    } catch {
      return api.Abort(c, 400, null, 'Invalid JSON body');
    }

    if (!body || Object.keys(body).length === 0) {
      return api.Abort(c, 400, null, 'Payload cannot be empty');
    }

    try {
      const user = await UserService.createUser(body);
      return c.json(user, 201);
    } catch (err: any) {
      if (err.name === "UserExistsError" || err.message?.includes("already exists")) {
        return api.Abort(c, 409, err, 'Username or email already exists');
      }

      return api.Abort(c, 500, err, 'Failed to create user');
    }
  },

  async GetUser(c: Context) {
    try {
      let userId = "";
      try {
        userId = api.GetStringUUIDParam(c, 'userId', false);
      } catch {
        userId = api.GetUserID(c, true);
      }

      if (!userId) return api.Abort(c, 400, null, 'User ID required');

      const user = await UserService.getUser(userId);
      if (!user) return api.Abort(c, 404, null, 'User not found');

      return c.json(user);
    } catch (err) {
      return api.Abort(c, 500, err, 'Failed to get user');
    }
  },

  async SignOut(c: Context) {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return api.Abort(c, 401, null, 'Authorization header required');

    const token = authHeader.replace('Bearer ', '').trim();

    try {
      const userId = api.GetUserID(c, true);
      if (!userId) return api.Abort(c, 401, null, 'Unauthorized');

      const deleted = await UserService.signOut(userId, token);
      if (!deleted) return api.Abort(c, 404, null, 'Token not found');

      return c.body(null, 204);
    } catch (err) {
      return api.Abort(c, 500, err, 'Failed to sign out');
    }
  },

  async UpdateUser(c: Context) {
    let body;
    try {
      body = await c.req.json();
    } catch {
      return api.Abort(c, 400, null, 'Invalid JSON body');
    }

    const updatedFields = Object.keys(body);
    const userReq = { ...body };

    try {
      let userId = "";
      try {
        userId = api.GetStringUUIDParam(c, 'userId', false);
      } catch {
        userId = api.GetUserID(c, true);
      }

      if (!userId) return api.Abort(c, 401, null, 'Unauthorized');

      userReq.id = userId;
      const updatedUser = await UserService.updateUser(userReq, updatedFields);

      return c.json(updatedUser);
    } catch (err) {
      return api.Abort(c, 500, err, 'Failed to update user');
    }
  },

  async DeleteUser(c: Context) {
    try {
      const userId = api.GetStringUUIDParam(c, 'userId', true);
      const success = await UserService.deleteUser(userId);
      if (!success) return api.Abort(c, 500, null, 'Failed to delete user');

      return c.body(null, 204);
    } catch (err: any) {
      if (err === api.ErrNotFound || err.message?.includes('not found')) {
        return api.Abort(c, 404, null, 'User not found');
      }
      return api.Abort(c, 500, err, 'Failed to delete user');
    }
  },

  async GetMe(c: Context) {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return api.Abort(c, 401, null, 'Authorization header required');

    const token = authHeader.replace('Bearer ', '').trim();

    try {
      const user = await UserService.getUserByToken(token);
      if (!user) return api.Abort(c, 404, null, 'User not found');

      return c.json(user);
    } catch (err) {
      return api.Abort(c, 500, err, 'Failed to get user');
    }
  },

  async VerifyEmail(c: Context) {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return api.Abort(c, 401, null, 'Authorization header required');

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return api.Abort(c, 401, null, 'Token required');

    try {
      const user = await UserService.getUserByToken(token);
      if (!user) return api.Abort(c, 404, null, 'User not found');

      const ok = await UserService.verifyEmail(user.id, token);
      return c.json(ok);
    } catch (err) {
      return api.Abort(c, 500, err, 'Failed to verify email');
    }
  }

};

export default UserController;
