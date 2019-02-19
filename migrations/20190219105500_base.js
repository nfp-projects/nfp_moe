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
      table.integer('login_id')
        .references('staff.id')
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
