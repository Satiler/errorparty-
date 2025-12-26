const { Track, Album, Playlist } = require('./src/models');
const { KissVKLightweightService } = require('./src/services/kissvk-lightweight.service');

const TOP_ARTISTS_2024_2025 = [
    // Global Pop Stars
    'Taylor Swift - Cruel Summer',
    'Taylor Swift - Anti-Hero',
    'Taylor Swift - Karma',
    'Billie Eilish - What Was I Made For',
    'Billie Eilish - Birds of a Feather',
    'Ariana Grande - yes and',
    'Olivia Rodrigo - vampire',
    'Olivia Rodrigo - get him back',
    'Sabrina Carpenter - Espresso',
    'Sabrina Carpenter - Please Please Please',
    'Sabrina Carpenter - Feather',
    
    // Hip-Hop & R&B
    'Drake - First Person Shooter',
    'Drake - IDGAF',
    'Travis Scott - FE!N',
    'Travis Scott - I KNOW',
    'The Weeknd - Popular',
    'The Weeknd - One of the Girls',
    'SZA - Kill Bill',
    'SZA - Snooze',
    'Doja Cat - Paint The Town Red',
    'Doja Cat - Agora Hills',
    
    // Dance & Electronic
    'David Guetta - I\'m Good Blue',
    'Calvin Harris - Miracle',
    'Tiesto - Lay Low',
    'Marshmello - Friends',
    'Kygo - Stargazing',
    
    // UK & International
    'Ed Sheeran - Eyes Closed',
    'Ed Sheeran - Boat',
    'Dua Lipa - Houdini',
    'Dua Lipa - Dance The Night',
    'Harry Styles - As It Was',
    'Sam Smith - Unholy',
    
    // Latin & Reggaeton
    'Bad Bunny - Monaco',
    'Bad Bunny - NADIE SABE',
    'Peso Pluma - ELLA BAILA SOLA',
    'Peso Pluma - La Bebé',
    'Karol G - MAMIII',
    'Karol G - TQG',
    
    // K-Pop
    'BTS - Seven',
    'NewJeans - Super Shy',
    'NewJeans - ETA',
    'FIFTY FIFTY - Cupid',
    'Stray Kids - LALALALA',
    
    // Rock & Alternative
    'Imagine Dragons - Eyes Closed',
    'OneRepublic - Runaway',
    'Coldplay - feelslikeimfallinginlove',
    'Arctic Monkeys - Body Paint',
    
    // Rising Stars
    'Tate McRae - greedy',
    'Tate McRae - exes',
    'Benson Boone - Beautiful Things',
    'Benson Boone - In The Stars',
    'Noah Kahan - Stick Season',
    'Noah Kahan - Dial Drunk',
    'Rema - Calm Down',
    'Jimin - Like Crazy',
    'Ice Spice - Deli',
    
    // More Popular Hits
    'Miley Cyrus - Flowers',
    'Miley Cyrus - Used to Be Young',
    'Rihanna - Lift Me Up',
    'Jung Kook - Standing Next to You',
    'Troye Sivan - Rush',
    'Troye Sivan - Got Me Started',
    'Lana Del Rey - Say Yes to Heaven',
    'Lana Del Rey - The Grants',
    'Post Malone - Chemical',
    'Post Malone - Mourning',
    '21 Savage - redrum',
    'Metro Boomin - Annihilate',
    'Future - Like That',
    
    // Dance Hits 2024-2025
    'Peggy Gou - It Makes You Forget',
    'Fred again - Adore u',
    'Anyma - Running',
    'Meduza - Bad Memories',
    'Purple Disco Machine - Substitution',
    
    // Extra Popular
    'Beyoncé - TEXAS HOLD EM',
    'Beyoncé - 16 CARRIAGES',
    'Nicki Minaj - Red Ruby Da Sleeze',
    'Dua Lipa - Training Season',
    'Ariana Grande - eternal sunshine',
    'Teddy Swims - Lose Control',
    'Hozier - Too Sweet',
    'Megan Thee Stallion - HISS',
    'Victoria Monét - On My Mama',
    'Jack Harlow - Lovin On Me'
];

async function importTopArtists() {
    console.log('\n🚀 ИМПОРТ ТОПОВЫХ АРТИСТОВ 2024-2025');
    console.log('=' .repeat(60));
    
    const kissVK = new KissVKLightweightService();
    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    
    for (let i = 0; i < TOP_ARTISTS_2024_2025.length; i++) {
        const query = TOP_ARTISTS_2024_2025[i];
        console.log(`\n[${i + 1}/${TOP_ARTISTS_2024_2025.length}] 🎵 ${query}`);
        
        try {
            // Поиск треков на KissVK
            const results = await kissVK.searchTracks(query, 3);
            
            if (!results.success || results.tracks.length === 0) {
                console.log(`   ❌ Не найден на KissVK`);
                errors++;
                continue;
            }
            
            const kissvkTrack = results.tracks[0];
            console.log(`   ✅ Найдено: ${kissvkTrack.artist} - ${kissvkTrack.title}`);
            
            // Проверка на дубликат
            const existing = await Track.findOne({
                where: {
                    streamUrl: kissvkTrack.streamUrl
                }
            });
            
            if (existing) {
                console.log(`   ⏭️  Трек уже существует`);
                duplicates++;
                continue;
            }
            
            // Сохранение трека
            const track = await Track.create({
                title: kissvkTrack.title,
                artist: kissvkTrack.artist,
                streamUrl: kissvkTrack.streamUrl,
                duration: kissvkTrack.duration || 180,
                coverUrl: kissvkTrack.coverUrl,
                provider: 'kissvk'
            });
            
            console.log(`   💾 Импортирован: ID ${track.id}`);
            imported++;
            
            // Небольшая задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 800));
            
        } catch (error) {
            console.log(`   ❌ Ошибка: ${error.message}`);
            errors++;
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 СТАТИСТИКА ИМПОРТА');
    console.log('='.repeat(60));
    console.log(`Обработано запросов: ${TOP_ARTISTS_2024_2025.length}`);
    console.log(`✅ Импортировано: ${imported}`);
    console.log(`⏭️  Дубликатов: ${duplicates}`);
    console.log(`❌ Ошибок: ${errors}`);
    console.log(`📈 Успешность: ${((imported / TOP_ARTISTS_2024_2025.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
    
    // Показываем итоговую статистику
    const totalTracks = await Track.count();
    console.log(`\n🎵 Всего треков в базе: ${totalTracks}`);
    
    process.exit(0);
}

importTopArtists().catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
});
