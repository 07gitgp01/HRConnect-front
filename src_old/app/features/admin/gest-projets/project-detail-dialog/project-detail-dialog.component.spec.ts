import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectDetailDialogComponent } from './project-detail-dialog.component';

describe('ProjectDetailDialogComponent', () => {
  let component: ProjectDetailDialogComponent;
  let fixture: ComponentFixture<ProjectDetailDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProjectDetailDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProjectDetailDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
