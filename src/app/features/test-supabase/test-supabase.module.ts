import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestSupabaseComponent } from './test-supabase.component';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    TestSupabaseComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [TestSupabaseComponent]
})
export class TestSupabaseModule { }
