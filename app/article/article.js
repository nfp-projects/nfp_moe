const m = require('mithril')
const ApiArticle = require('../api/article.p')
const Authentication = require('../authentication')
const Fileinfo = require('../widgets/fileinfo')

const Article = {
  oninit: function(vnode) {
    this.error = ''
    this.lastarticle = m.route.param('article') || '1'
    this.loadingnews = false

    if (window.__nfpdata) {
      this.path = m.route.param('id')
      this.article = window.__nfpdata
      window.__nfpdata = null
    } else {
      this.fetchArticle(vnode)
    }
  },

  fetchArticle: function(vnode) {
    this.path = m.route.param('id')
    this.article = {
      id: 0,
      name: '',
      path: '',
      description: '',
      media: null,
      banner: null,
      files: [],
    }
    this.loading = true

    ApiArticle.getArticle(this.path)
    .then(function(result) {
      vnode.state.article = result
      if (result.parent) {
        document.title = result.name + ' - ' + result.parent.name + ' - NFP Moe'
      } else {
        document.title = result.name + ' - NFP Moe'
      }
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = vnode.state.loadingnews = false
      m.redraw()
    })
  },

  onupdate: function(vnode) {
    if (this.path !== m.route.param('id')) {
      this.fetchArticle(vnode)
    }
  },

  view: function(vnode) {
    return (
      this.loading ?
        m('div.loading-spinner')
      : m('article.article', [
          m('header', m('h1', this.article.name)),
          m('.fr-view', [
            this.article.media
              ? m('a.cover', {
                  rel: 'noopener',
                  href: this.article.media.url,
                }, m('img', { src: this.article.media.medium_url, alt: 'Cover image for ' + this.article.name }))
              : null,
            this.article.description ? m.trust(this.article.description) : null,
            (this.article.files && this.article.files.length
              ? this.article.files.map(function(file) {
                  return m(Fileinfo, { file: file })
                })
              : null),
          ]),
          Authentication.currentUser
            ? m('div.admin-actions', [
              m('span', 'Admin controls:'),
              m(m.route.Link, { href: '/admin/articles/' + this.article.id }, 'Edit article'),
            ])
            : null,
        ])
    )
  },
}

module.exports = Article

/*
<div id="disqus_thread"></div>
<script>

/**
*  RECOMMENDED CONFIGURATION VARIABLES: EDIT AND UNCOMMENT THE SECTION BELOW TO INSERT DYNAMIC VALUES FROM YOUR PLATFORM OR CMS.
*  LEARN WHY DEFINING THESE VARIABLES IS IMPORTANT: https://disqus.com/admin/universalcode/#configuration-variables*/
/*
var disqus_config = function () {
this.page.url = PAGE_URL;  // Replace PAGE_URL with your page's canonical URL variable
this.page.identifier = PAGE_IDENTIFIER; // Replace PAGE_IDENTIFIER with your page's unique identifier variable
};
/
(function() { // DON'T EDIT BELOW THIS LINE
var d = document, s = d.createElement('script');
s.src = 'https://nfp-moe.disqus.com/embed.js';
s.setAttribute('data-timestamp', +new Date());
(d.head || d.body).appendChild(s);
})();
</script>
<noscript>Please enable JavaScript to view the <a href="https://disqus.com/?ref_noscript">comments powered by Disqus.</a></noscript>
*/
