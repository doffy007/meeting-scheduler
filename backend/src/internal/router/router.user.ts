import { Hono } from "hono";
import { UserController } from "../handler/user.handler";
import { SetupParams, NoAnonymous } from "../api/middleware";   

const userHandler = new Hono();

userHandler.post("/signin", UserController.SignIn);
userHandler.post("/verify", UserController.VerifyEmail);
userHandler.post("/signout", SetupParams, NoAnonymous, UserController.SignOut);
userHandler.get("/me", SetupParams, NoAnonymous, UserController.GetMe);

userHandler.post("", UserController.CreateUser);
userHandler.get("/:userId", SetupParams, NoAnonymous, UserController.GetUser);
userHandler.put("/:userId", SetupParams, NoAnonymous, UserController.UpdateUser);
userHandler.delete("/:userId", SetupParams, NoAnonymous, UserController.DeleteUser);

export default userHandler;