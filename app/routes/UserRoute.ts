import * as express from 'express';
import { UserController } from '../controllers/UserController';
import * as UserMiddleware from '../middlewares/UserMiddleware';

export const UserRoute: express.Router = express.Router()
	.get('/users', UserController.All)
	.post('/register', [UserMiddleware.CheckCreate], UserController.Create)
	.post('/login', [UserMiddleware.CheckLogin], UserController.Login)

	// User Routes
	.get('/users/:vanityURL', [UserMiddleware.CheckFind], UserController.Find)
	.patch('/users/:id', [UserMiddleware.CheckUpdate], UserController.Update)
	.post('/users/:id/follow', [UserMiddleware.CheckUpdate], UserController.Follow)
	.post('/users/:id/unfollow', [UserMiddleware.CheckUpdate], UserController.Unfollow)
	.get('/users/:vanityURL/following', [UserMiddleware.CheckUpdate], UserController.GetFollowing)
	.post('/users/:id/profile-picture', [UserMiddleware.CheckUpdate], UserController.UploadProfilePic)
	.delete('/users/:id', [UserMiddleware.CheckDelete], UserController.Delete)
