const express = require('express');
const bodyParser = require('body-parser');
const { Cycle } = require('./cycle');
const axios = require('axios');

// создаём express приложение
const app = express();
app.use(bodyParser.json());

// конфиг
const PORT = 8000;
const TRANSPORT_URL = 'http://192.168.94.1:8081/transfer';

const CHANCE_OF_ERROR = 0.1; // Вероятность ошибки
const CHANCE_OF_LOSS = 0.02;  // Вероятность потери

app.post('/code', async (req, res) => {
    const segment = req.body;

    console.log('\n====================== Обработка нового сегмента ======================');
    console.log('Получен сегмент от транспортного уровня:', segment);

    // Только обрабатываем payload
    const payload = segment.payload;

    if (!payload) {
        console.error('Поле payload отсутствует в сегменте!');
        return res.status(400).send({ error: 'Missing payload in the segment.' });
    }

    // Преобразование payload в битовую строку
    const dataStr = payload;
    const bitStr = toBitString(dataStr);
    console.log('Строка преобразована в битовую строку:', bitStr);

    // Разбиение битовой строки на чанки
    const chunks = chunkString(bitStr, 11);
    // console.log(`Разбитый на чанки (по 11 бит):`, chunks);

    // Кодирование каждого чанка
    const codedChunks = chunks.map(Cycle.coding);
    // console.log('Закодированные чанки:', codedChunks);

    // Внесение случайной ошибки в кадры с вероятностью CHANCE_OF_ERROR
    const erroredChunks = codedChunks.map(chunk => {
        if (Math.random() < CHANCE_OF_ERROR) {
            const index = Math.floor(Math.random() * chunk.length);
            const flipped = chunk[index] === '1' ? '0' : '1';
            console.log(`Ошибка внесена в чанк: ${chunk} (бит ${index} изменён)`);
            return chunk.slice(0, index) + flipped + chunk.slice(index + 1);
        }
        return chunk;
    });
    // console.log('Ошибочные чанки:', erroredChunks);

    // Возможная потеря кадра с вероятностью CHANCE_OF_LOSS
    if (Math.random() < CHANCE_OF_LOSS) {
        console.log('Сегмент потерян при передаче!');
        return res.status(200).send({ message: 'Segment lost (simulated).' });
    }

    // Декодирование чанков
    const decodedChunks = erroredChunks.map(Cycle.decoding);
    // console.log('Декодированные чанки:', decodedChunks);

    // Сборка декодированного битового потока
    const decodedBitStr = decodedChunks.join('');
    // console.log('Декодированная битовая строка:', decodedBitStr);

    // Преобразование обратно в байты
    const decodedBytes = bitStringToBytes(decodedBitStr);
    // console.log('Декодированные байты:', decodedBytes);

    // Если декодированные байты пустые
    if (!decodedBytes || decodedBytes.length === 0) {
        console.error('Декодированные байты пусты!');
        return res.status(500).send({ error: 'Decoded bytes empty!' });
    }

    try {
        // Преобразуем байты обратно в строку
        const decodedPayload = decodedBytes;

        // Обновляем только поле payload
        const responseSegment = {
            ...segment,        // Сохраняем все поля как есть
            payload: decodedPayload // Обновляем только payload
        };

        console.log('Декодированный сегмент готов к отправке:', responseSegment);

        // Отправка данных на транспортный уровень
        const response = await axios.post(TRANSPORT_URL, responseSegment);
        console.log('Ответ от транспортного уровня:', response.status);

        res.status(200).send({ message: 'Segment processed and sent back.' });
    } catch (err) {
        console.error('Ошибка при декодировании или отправке:', err.message);
        res.status(500).send({ error: 'Decoding failed.' });
    }
});

// запускаем сервер
app.listen(PORT, () => {
    console.log(`Channel level service running on http://localhost:${PORT}`);
});

// Функция для преобразования строки в битовую строку
function toBitString(str) {
    return [...Buffer.from(str)].map(byte => byte.toString(2).padStart(8, '0')).join('');
}

// Функция для преобразования битовой строки в байты
function bitStringToBytes(bitStr) {
    const bytes = [];
    for (let i = 0; i < bitStr.length; i += 8) {
        const byte = bitStr.slice(i, i + 8);
        if (byte.length === 8) {
            bytes.push(parseInt(byte, 2));
        }
    }
    return Buffer.from(bytes).toString();
}

// Функция для разбиения строки на чанки
function chunkString(str, length) {
    const chunks = [];
    for (let i = 0; i < str.length; i += length) {
        let slice = str.slice(i, i + length);
        // Если длина меньше 11, «дополняем» нулями справа (или слева — зависит от методики)
        if (slice.length < length) {
            slice = slice.padEnd(length, '0');
        }
        chunks.push(slice);
    }
    return chunks;
}
