import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login';
import { AuthService} from '../../core/services/auth';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authMock: any;
  let routerMock: any;

  beforeEach(async () => {
    authMock = {
      login: vi.fn()
    };

    routerMock = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call auth.login and navigate on success', () => {
    authMock.login.mockReturnValue(of({}));

    component.form.setValue({
      username: 'admin',
      password: 'pass'
    });

    component.submit();

    expect(authMock.login).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/deals']);
  });

  it('should set error message on failure', () => {
    authMock.login.mockReturnValue(
      throwError(() => ({ error: { message: 'Invalid credentials' } }))
    );

    component.form.setValue({
      username: 'x',
      password: 'y'
    });

    component.submit();

    expect(component.error).toBe('Invalid credentials');
  });
});
