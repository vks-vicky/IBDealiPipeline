import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user';
import { environment } from '../../../environments/environment';

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService]
    }).compileComponents();

    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should fetch all users', () => {
    const mockUsers = [{ id: '1', username: 'admin' }];

    service.getAll().subscribe(res => {
      expect(res).toEqual(mockUsers);
    });

    const req = http.expectOne(`${environment.apiUrl}/admin/users`);
    expect(req.request.method).toBe('GET');

    req.flush(mockUsers);
  });

  it('should create a new user', () => {
    const payload = { username: 'john', email: 'john@test.com', password: '123', role: 'USER' };

    service.create(payload).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/admin/users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush({});
  });

  it('should update user status', () => {
    service.updateStatus('123', false).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/admin/users/123/status`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ active: false });

    req.flush({});
  });
});
