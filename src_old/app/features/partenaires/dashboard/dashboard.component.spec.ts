import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PartenaireDashboardComponent } from './dashboard.component';


describe('DashboardComponent', () => {
  let component: PartenaireDashboardComponent;
  let fixture: ComponentFixture<PartenaireDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PartenaireDashboardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PartenaireDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
