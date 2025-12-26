/**
 * Migration: Add provider fields to Tracks table
 * Добавление новых полей для системы провайдеров
 */

const { Track, sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function migrate() {
  console.log('🔄 Starting Track model migration...\n');

  try {
    // Добавляем новые колонки (если их нет)
    console.log('📝 Adding new columns...');
    
    await sequelize.query(`
      ALTER TABLE "Tracks" 
      ADD COLUMN IF NOT EXISTS "provider" VARCHAR(255) DEFAULT 'lmusic',
      ADD COLUMN IF NOT EXISTS "providerTrackId" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "lastChecked" TIMESTAMP WITH TIME ZONE;
    `);

    console.log('✅ New columns added\n');

    // Миграция существующих данных
    console.log('🔄 Migrating existing data...\n');

    // 1. Локальные треки (filePath не null и не URL)
    const localCount = await Track.update(
      { 
        provider: 'local',
        isVerified: true,
        lastChecked: new Date()
      },
      {
        where: {
          filePath: { [Op.ne]: null },
          filePath: { [Op.notLike]: 'http%' }
        }
      }
    );
    console.log(`   ✅ Local tracks: ${localCount[0]}`);

    // 2. Lmusic треки
    const lmusicCount = await Track.update(
      { 
        provider: 'lmusic',
        isVerified: null // Требуют проверки
      },
      {
        where: {
          [Op.or]: [
            { streamUrl: { [Op.like]: '%lmusic%' } },
            { externalSource: 'lmusic.kz' }
          ],
          provider: null
        }
      }
    );
    console.log(`   ✅ Lmusic tracks: ${lmusicCount[0]}`);

    // 3. Jamendo треки
    const jamendoCount = await Track.update(
      { 
        provider: 'jamendo',
        isVerified: null
      },
      {
        where: {
          [Op.or]: [
            { externalSource: 'jamendo' },
            { sourceType: 'jamendo' }
          ],
          provider: null
        }
      }
    );
    console.log(`   ✅ Jamendo tracks: ${jamendoCount[0]}`);

    // 4. VK треки
    const vkCount = await Track.update(
      { 
        provider: 'vk',
        isVerified: null
      },
      {
        where: {
          [Op.or]: [
            { streamUrl: { [Op.like]: '%vk.com%' } },
            { externalSource: 'vk' }
          ],
          provider: null
        }
      }
    );
    console.log(`   ✅ VK tracks: ${vkCount[0]}`);

    // 5. Треки с hitmo (помечаем как не проверенные)
    const hitmoCount = await Track.update(
      { 
        provider: 'unknown',
        isVerified: false,
        lastChecked: new Date()
      },
      {
        where: {
          streamUrl: { [Op.like]: '%hitmo%' },
          provider: null
        }
      }
    );
    console.log(`   ⚠️  Hitmo tracks (marked as unverified): ${hitmoCount[0]}`);

    // 6. Остальные треки
    const unknownCount = await Track.update(
      { 
        provider: 'unknown',
        isVerified: null
      },
      {
        where: {
          provider: null
        }
      }
    );
    console.log(`   ⚠️  Unknown tracks: ${unknownCount[0]}`);

    // Статистика после миграции
    console.log('\n📊 Migration statistics:');
    const stats = await Track.findAll({
      attributes: [
        'provider',
        [sequelize.fn('COUNT', '*'), 'count'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN "isVerified" = true THEN 1 ELSE 0 END')), 'verified'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN "isVerified" = false THEN 1 ELSE 0 END')), 'failed'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN "isVerified" IS NULL THEN 1 ELSE 0 END')), 'unchecked']
      ],
      group: ['provider'],
      raw: true
    });

    console.log('\nBy provider:');
    stats.forEach(stat => {
      console.log(`   ${stat.provider}: ${stat.count} total (✅ ${stat.verified || 0} verified, ❌ ${stat.failed || 0} failed, ⏳ ${stat.unchecked || 0} unchecked)`);
    });

    // Создаем индексы
    console.log('\n📝 Creating indexes...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "tracks_provider_idx" ON "Tracks" ("provider");
      CREATE INDEX IF NOT EXISTS "tracks_is_verified_idx" ON "Tracks" ("isVerified");
      CREATE INDEX IF NOT EXISTS "tracks_last_checked_idx" ON "Tracks" ("lastChecked");
    `);
    console.log('✅ Indexes created\n');

    console.log('✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Запуск миграции
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = migrate;
