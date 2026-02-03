import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageDetailDialogComponent } from './message-detail-dialog.component';

describe('MessageDetailDialogComponent', () => {
  let component: MessageDetailDialogComponent;
  let fixture: ComponentFixture<MessageDetailDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MessageDetailDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MessageDetailDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
