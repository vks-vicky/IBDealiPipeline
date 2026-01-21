import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UserManagement } from './user-management';
import { UserService } from '../../core/services/user';
import { RouterTestingModule } from '@angular/router/testing';

describe('UserManagement', () => {
  let fixture: ComponentFixture<UserManagement>;
  let component: UserManagement;
  let userMock: any;

  const mockUsers = [
    { id: '1', username: 'alice', email: 'a@test.com', role: 'USER', active: true },
    { id: '2', username: 'bob', email: 'b@test.com', role: 'ADMIN', active: false }
  ];

  beforeEach(async () => {
    userMock = {
      getAll: vi.fn().mockReturnValue(of(mockUsers)),
      updateStatus: vi.fn().mockReturnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [UserManagement, RouterTestingModule],
      providers: [
        { provide: UserService, useValue: userMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagement);
    component = fixture.componentInstance;
    fixture.detectChanges(); // runs ngOnInit + renders template
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render users in table', () => {
    const html = fixture.nativeElement as HTMLElement;

    expect(html.textContent).toContain('alice');
    expect(html.textContent).toContain('bob');
    expect(html.textContent).toContain('Active');
    expect(html.textContent).toContain('Inactive');
  });

  it('should show correct action labels', () => {
    const toggles = fixture.nativeElement.querySelectorAll('mat-slide-toggle');

    expect(toggles.length).toBe(2); // one toggle per user
    expect(toggles[0].classList.contains('toggle-active')).toBe(true); // alice = active
    expect(toggles[1].classList.contains('toggle-inactive')).toBe(true); // bob = inactive
  });

  it('should call updateStatus when clicking action button', () => {
    const toggle = component.paginatedUsers[0]; // alice
    component.toggle(toggle);

    expect(userMock.updateStatus).toHaveBeenCalledWith('1', false);
  });

  it('should have create-user dialog button', () => {
    const btn = fixture.nativeElement.querySelector('button.create-button');

    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Add New User');
  });
});
