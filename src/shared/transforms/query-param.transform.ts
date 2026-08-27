import { Transform } from 'class-transformer';

/**
 * Разбор значений, приходящих в query-строке.
 *
 * Глобальный `ValidationPipe` включает `enableImplicitConversion`, а
 * class-transformer приводит значение к boolean через `Boolean(value)` —
 * непустая строка `'false'` при этом становится `true`. Поэтому логические
 * query-параметры нужно разбирать явно, а массивы — собирать руками: express
 * отдаёт `?ids=a` строкой, `?ids=a&ids=b` массивом, и форма `?ids=a,b` тоже
 * встречается.
 *
 * Нераспознанное значение возвращается КАК ЕСТЬ, а не превращается в
 * `undefined`: пусть его отбракует `@IsBoolean()`/`@IsString({ each: true })`
 * с внятной ошибкой 400, а не тихо исчезнет вместе с условием отбора.
 */

export function parseBooleanParam(raw: unknown): unknown {
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (raw === 'true' || raw === '1') {
    return true;
  }
  if (raw === 'false' || raw === '0') {
    return false;
  }
  return raw;
}

export function parseStringArrayParam(raw: unknown): unknown {
  if (raw === undefined || raw === null) {
    return raw;
  }

  return (Array.isArray(raw) ? raw : [raw])
    .flatMap((item: unknown) =>
      typeof item === 'string' ? item.split(',') : [item],
    )
    .map((item: unknown) => (typeof item === 'string' ? item.trim() : item))
    .filter((item: unknown) => item !== '');
}

/**
 * Оба декоратора читают СЫРОЕ значение из `obj`, а не уже приведённое
 * `value`: неявное приведение отрабатывает раньше кастомного трансформа
 * (`TransformOperationExecutor`), и до `value` строка `'false'` доходит уже
 * испорченной.
 */
export const ToBooleanParam = (): PropertyDecorator =>
  Transform(({ obj, key }) =>
    parseBooleanParam((obj as Record<string, unknown>)[key]),
  );

export const ToStringArrayParam = (): PropertyDecorator =>
  Transform(({ obj, key }) =>
    parseStringArrayParam((obj as Record<string, unknown>)[key]),
  );
