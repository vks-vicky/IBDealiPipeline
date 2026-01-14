import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { UserForm } from './user-form';
import { UserService } from '../../core/services/user';

describe('UserForm', () => {
  let fixture: ComponentFixture<UserForm>;
  let component: UserForm;
  let userMock: any;
  let routerMock: any;

  beforeEach(async () => {
    userMock = {
      create: vi.fn()
    };

    routerMock = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [UserForm],
      providers: [
        { provide: UserService, useValue: userMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form on init', () => {
    expect(component.form).toBeDefined();
    expect(component.form.get('username')).toBeTruthy();
    expect(component.form.get('email')).toBeTruthy();
    expect(component.form.get('password')).toBeTruthy();
    expect(component.form.get('role')).toBeTruthy();
  });

  it('should not submit when form is invalid', () => {
    component.form.patchValue({
      username: '',
      email: '',
      password: '',
      role: 'USER'
    });

    component.submit();

    expect(userMock.create).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should create user and navigate on valid submit', () => {
    userMock.create.mockReturnValue(of({}));

    component.form.patchValue({
      username: 'john',
      email: 'john@bank.com',
      password: 'secret',
      role: 'ADMIN'
    });

    component.submit();

    expect(userMock.create).toHaveBeenCalledWith({
      username: 'john',
      email: 'john@bank.com',
      password: 'secret',
      role: 'ADMIN'
    });

    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin']);
  });
});
