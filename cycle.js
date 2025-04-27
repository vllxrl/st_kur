class Cycle {
    constructor() {
        this.generator = "10011"; // Порождающий полином [15,11]
    }

    static coding(bitStr) {
        const instance = new Cycle();
        bitStr += "0000"; // Добавляем 4 нуля (CRC)
        const remainder = instance.moduloDivision(bitStr);
        const codeword = bitStr.slice(0, -4) + remainder;
        return codeword;
    }

    static decoding(codeword) {
        const instance = new Cycle();

        // 1. Начальный остаток
        let remainder = instance.moduloDivision(codeword);
        // console.log(`[decoding] Начало. codeword=${codeword}, remainder=${remainder}`);

        // 2. Если остаток "0000", нет ошибки
        if (remainder === "0000") {
            // console.log("[decoding] Ошибок нет, просто убираем CRC.");
            return codeword.slice(0, -4);
        }

        // 3. Иначе пытаемся сдвигать до 15 раз
        let d = parseInt(remainder, 2);
        let iter = 0;
        console.log(`[decoding] Начало. codeword=${codeword}, remainder=${remainder}`);
        console.log("[decoding] Ошибка обнаружена. Пробуем циклические сдвиги...");

        // Изменено условие: цикл продолжается, пока d > 1 (а не пока d !== 0)
        while (d > 1 && iter < 15) {
            iter++;
            // Циклический сдвиг "вправо": последний бит -> вперёд
            codeword = codeword.slice(-1) + codeword.slice(0, -1);

            remainder = instance.moduloDivision(codeword);
            d = parseInt(remainder, 2);
            console.log(`[decoding] Сдвиг #${iter}. codeword=${codeword}, remainder=${remainder}`);
        }

        // 4. Если после сдвигов d > 1, значит исправить ошибку не удалось
        if (d > 1) {
            console.log("[decoding] Не удалось найти remainder=0. Возвращаем битый пакет (обрезаем CRC).");
            return codeword.slice(0, -4);
        }

        // 5. d равно 0 или 1, считаем, что ошибка корректируема – применяем XOR с d
        console.log(`[decoding] remainder=0 найден на сдвиге #${iter}. Применяем XOR c ${d}.`);
        let numeric = parseInt(codeword, 2) ^ d;
        let corrected = numeric.toString(2).padStart(15, '0');
        console.log(`[decoding] После XOR: ${corrected}`);

        // 6. Сдвигаем обратно на iter раз (в обратную сторону, т.е. "сдвиг влево")
        for (let i = 0; i < iter; i++) {
            corrected = corrected.slice(1) + corrected[0];
        }
        console.log(`[decoding] После обратного сдвига: ${corrected}`);

        // 7. Убираем 4 контрольных бита
        const result = corrected.slice(0, -4);
        console.log(`[decoding] Финальный результат: ${result} (убираем CRC)`);
        return result;
    }

    /**
     * Деление по модулю 2, возвращающее 4-битный остаток (CRC).
     */
    moduloDivision(dividend) {
        let remainder = dividend.slice(0, this.generator.length);
        for (let i = this.generator.length; i <= dividend.length; i++) {
            if (remainder[0] === '1') {
                remainder = this.xor(remainder, this.generator);
            } else {
                remainder = this.xor(remainder, '0'.repeat(this.generator.length));
            }
            if (i < dividend.length) {
                remainder = remainder.slice(1) + dividend[i];
            } else {
                remainder = remainder.slice(1);
            }
        }
        return remainder.padStart(this.generator.length - 1, '0');
    }

    /**
     * Побитовое XOR двух строк (равной длины).
     */
    xor(a, b) {
        let result = '';
        for (let i = 0; i < a.length; i++) {
            result += (a[i] === b[i]) ? '0' : '1';
        }
        return result;
    }
}

module.exports = { Cycle };
