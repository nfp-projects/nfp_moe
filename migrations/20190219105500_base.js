/* eslint-disable */

exports.up = function up(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('staff', function(table) {
      table.increments()
      table.text('email')
      table.text('fullname')
      table.boolean('is_deleted')
        .notNullable()
        .default(false)
      table.integer('level')
        .notNullable()
        .defaultTo(1)
      table.timestamps()
    })
    .then(pass =>
      knex('staff').insert({
        email: 'jonatan@nilsson.is',
        fullname: 'Admin',
        level: 100,
      })
    ),
    knex.schema.createTable('media', function(table) {
      table.increments()
      table.text('filename')
      table.text('filetype')
      table.text('small_image')
      table.text('medium_image')
      table.text('large_image')
      table.integer('size')
      table.integer('staff_id')
        .references('staff.id')
      table.boolean('is_deleted')
        .notNullable()
        .default(false)
      table.timestamps()
    }),
    knex.schema.createTable('files', function(table) {
      table.increments()
      table.text('filename')
      table.text('filetype')
      table.integer('size')
      table.integer('staff_id')
        .references('staff.id')
      table.boolean('is_deleted')
        .notNullable()
        .default(false)
      table.timestamps()
    }),
    knex.schema.createTable('pages', function(table) {
      table.increments()
      table.integer('staff_id')
        .references('staff.id')
      table.integer('parent_id')
        .references('pages.id')
      table.text('name')
      table.text('path')
      table.text('description')
      table.integer('banner_id')
        .references('media.id')
        .defaultTo(null)
      table.integer('media_id')
        .references('media.id')
        .defaultTo(null)
      table.boolean('is_deleted')
        .notNullable()
        .default(false)
      table.timestamps()
    }),
    knex.schema.createTable('articles', function(table) {
      table.increments()
      table.integer('staff_id')
        .references('staff.id')
      table.integer('parent_id')
        .references('pages.id')
      table.text('name')
      table.text('path')
      table.text('description')
      table.integer('banner_id')
        .references('media.id')
        .defaultTo(null)
      table.integer('media_id')
        .references('media.id')
        .defaultTo(null)
      table.boolean('is_deleted')
        .notNullable()
        .default(false)
      table.timestamps()
    }),
    knex.schema.createTable('files', function(table) {
      table.increments()
      table.integer('file_id')
        .references('files.id')
      table.text('filename')
      table.text('filetype')
      table.integer('size')
      table.integer('staff_id')
        .references('staff.id')
      table.boolean('is_deleted')
        .notNullable()
        .default(false)
      table.timestamps()
    }),
  ])
}

exports.down = function down(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable('media'),
    knex.schema.dropTable('staff'),
  ])
}
