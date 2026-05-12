import { TestBed } from '@angular/core/testing';

import { PostServiceTsService } from './post.service.ts.service';

describe('PostServiceTsService', () => {
  let service: PostServiceTsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PostServiceTsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
