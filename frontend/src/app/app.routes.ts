import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { HomeComponent } from './pages/home/home.component'; 
import { AuthGuard } from './guards/auth.guard';

export const appRoutes: Routes = [
  { path: '', component: HomeComponent, canActivate: [AuthGuard] },  // protected home route
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent }
];
