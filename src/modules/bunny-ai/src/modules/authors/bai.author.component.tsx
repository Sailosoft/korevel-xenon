"use client";

import Bunny from '@/src/modules/bunny/src/Bunny';
import BunnyForm from '@/src/modules/bunny/src/form/BunnyForm';
import { baiAuthorModule } from './bai.author.module';

export default function BAIAuthorComponent() {
  return (
    <Bunny config={baiAuthorModule}>
      <BunnyForm />
    </Bunny>
  )
}